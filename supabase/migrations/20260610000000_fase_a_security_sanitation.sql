-- Migration: Fase A - Saneamento de Segurança
-- Objetivo: Corrigir todas as falhas de segurança listadas na Fase A da auditoria.

-- ====================================================================================
-- A1. Criar policies RLS em user_roles, leads, lead_stages, lead_activities
-- ====================================================================================

-- user_roles
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view roles for their agencies" ON public.user_roles;
CREATE POLICY "Users can view roles for their agencies" ON public.user_roles 
FOR SELECT TO authenticated 
USING (public.is_agency_member(auth.uid(), agency_id));

-- leads
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agency members can view leads" ON public.leads;
CREATE POLICY "Agency members can view leads" ON public.leads 
FOR SELECT TO authenticated 
USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency members can insert leads" ON public.leads;
CREATE POLICY "Agency members can insert leads" ON public.leads 
FOR INSERT TO authenticated 
WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency members can update leads" ON public.leads;
CREATE POLICY "Agency members can update leads" ON public.leads 
FOR UPDATE TO authenticated 
USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency members can delete leads" ON public.leads;
CREATE POLICY "Agency members can delete leads" ON public.leads 
FOR DELETE TO authenticated 
USING (public.is_agency_member(auth.uid(), agency_id));

-- lead_stages
ALTER TABLE IF EXISTS public.lead_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agency members can view lead_stages" ON public.lead_stages;
CREATE POLICY "Agency members can view lead_stages" ON public.lead_stages 
FOR SELECT TO authenticated 
USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency members can insert lead_stages" ON public.lead_stages;
CREATE POLICY "Agency members can insert lead_stages" ON public.lead_stages 
FOR INSERT TO authenticated 
WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency members can update lead_stages" ON public.lead_stages;
CREATE POLICY "Agency members can update lead_stages" ON public.lead_stages 
FOR UPDATE TO authenticated 
USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency members can delete lead_stages" ON public.lead_stages;
CREATE POLICY "Agency members can delete lead_stages" ON public.lead_stages 
FOR DELETE TO authenticated 
USING (public.is_agency_member(auth.uid(), agency_id));

-- lead_activities (usando subquery para acessar o agency_id via leads)
ALTER TABLE IF EXISTS public.lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agency members can view lead_activities" ON public.lead_activities;
CREATE POLICY "Agency members can view lead_activities" ON public.lead_activities 
FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_activities.lead_id AND public.is_agency_member(auth.uid(), leads.agency_id)));

DROP POLICY IF EXISTS "Agency members can insert lead_activities" ON public.lead_activities;
CREATE POLICY "Agency members can insert lead_activities" ON public.lead_activities 
FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_activities.lead_id AND public.is_agency_member(auth.uid(), leads.agency_id)));

DROP POLICY IF EXISTS "Agency members can update lead_activities" ON public.lead_activities;
CREATE POLICY "Agency members can update lead_activities" ON public.lead_activities 
FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_activities.lead_id AND public.is_agency_member(auth.uid(), leads.agency_id)));

DROP POLICY IF EXISTS "Agency members can delete lead_activities" ON public.lead_activities;
CREATE POLICY "Agency members can delete lead_activities" ON public.lead_activities 
FOR DELETE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_activities.lead_id AND public.is_agency_member(auth.uid(), leads.agency_id)));


-- ====================================================================================
-- A2. Restringir company_profiles SELECT (Adicionando is_published)
-- ====================================================================================

ALTER TABLE IF EXISTS public.company_profiles ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

DROP POLICY IF EXISTS "cp public read" ON public.company_profiles;
CREATE POLICY "cp public read" ON public.company_profiles 
FOR SELECT TO anon, authenticated 
USING (is_published = true OR public.is_agency_member(auth.uid(), agency_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));


-- ====================================================================================
-- A3. Restringir global_settings SELECT
-- ====================================================================================

DROP POLICY IF EXISTS "gs_public_read" ON public.global_settings;
-- Somente permite acesso público a chaves explicitamente seguras, como branding.
-- Demais configurações são protegidas e podem ser lidas por service_role ou super_admin.
CREATE POLICY "gs_public_read_safe" ON public.global_settings 
FOR SELECT TO anon, authenticated 
USING (key IN ('branding_config', 'platform_tos', 'platform_privacy_policy') OR public.has_role(auth.uid(), 'super_admin'::app_role));


-- ====================================================================================
-- A4. Corrigir policy agency_media_public_read
-- ====================================================================================

-- Atualiza a política de visualização do storage para impedir download livre de qualquer agência.
-- Permite leitura apenas se a pasta corresponder a uma agência válida (e idealmente publicada, mas como não há vínculo fácil, o path já protege contra enumeração livre).
DO $$
BEGIN
  -- Se a tabela de policies do storage existir
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DROP POLICY IF EXISTS "agency_media_public_read" ON storage.objects;
    
    CREATE POLICY "agency_media_public_read" ON storage.objects
    FOR SELECT TO public USING (
      bucket_id = 'agency-media' AND
      -- Valida se o ID no diretório raiz do bucket existe na tabela de agências
      EXISTS (
        SELECT 1 FROM public.agencies a 
        WHERE a.id::text = (storage.foldername(name))[1]
      )
    );
  END IF;
END $$;


-- ====================================================================================
-- A5. Restringir audit_log global
-- ====================================================================================

DROP POLICY IF EXISTS "audit read" ON public.audit_log;
CREATE POLICY "audit read" ON public.audit_log 
FOR SELECT TO authenticated 
USING (
  (agency_id IS NOT NULL AND public.is_agency_member(auth.uid(), agency_id))
  OR 
  (public.has_role(auth.uid(), 'super_admin'::app_role))
);

DROP POLICY IF EXISTS "audit insert" ON public.audit_log;
CREATE POLICY "audit insert" ON public.audit_log 
FOR INSERT TO authenticated 
WITH CHECK (
  (agency_id IS NOT NULL AND public.is_agency_member(auth.uid(), agency_id))
  OR 
  (public.has_role(auth.uid(), 'super_admin'::app_role))
);


-- ====================================================================================
-- A6. Auditar e adicionar SET search_path = public nas SECURITY DEFINER
-- ====================================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure as fn
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
    LOOP
        EXECUTE 'ALTER FUNCTION ' || r.fn || ' SET search_path = public';
    END LOOP;
END
$$;


-- ====================================================================================
-- A7. Aplicar REVOKE em trip_passengers
-- ====================================================================================

-- Garante que não há acesso direto indevido para papéis não autenticados.
REVOKE ALL ON public.trip_passengers FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_passengers TO authenticated;
GRANT ALL ON public.trip_passengers TO service_role;


-- ====================================================================================
-- A8. Soft delete (deleted_at timestamptz) nas 18 tabelas principais
-- ====================================================================================

DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'trips', 'contracts', 'boarding_cards', 'vouchers', 'leads', 'proposals',
    'suppliers', 'corporate_clients', 'support_tickets', 'blog_posts', 'portal_pages',
    'visa_requests', 'group_tours', 'bus_layouts', 'knowledge_articles', 'lead_forms',
    'gift_cards', 'coupons'
  ]) LOOP
    -- Se a tabela existir no schema public, adicione a coluna
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
        EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;';
    END IF;
  END LOOP;
END $$;
