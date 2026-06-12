-- ==============================================================================
-- FASE A: SANEAMENTO DE SEGURANÇA E FONTE DA VERDADE (AUDITORIA ESTRATÉGICA)
-- ==============================================================================

-- 1. Políticas ausentes nas tabelas de CRM (leads, lead_stages, lead_activities)
-- Essas tabelas tinham RLS habilitado mas nenhuma policy de leitura/escrita, 
-- o que resultava em bypass obrigatório via RPCs.
DROP POLICY IF EXISTS "Leads are viewable by agency members" ON public.leads;
CREATE POLICY "Leads are viewable by agency members" ON public.leads
  FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Leads are insertable by agency members" ON public.leads;
CREATE POLICY "Leads are insertable by agency members" ON public.leads
  FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Leads are updatable by agency members" ON public.leads;
CREATE POLICY "Leads are updatable by agency members" ON public.leads
  FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Leads are deletable by agency members" ON public.leads;
CREATE POLICY "Leads are deletable by agency members" ON public.leads
  FOR DELETE USING (public.is_agency_member(auth.uid(), agency_id));

-- Lead Stages
DROP POLICY IF EXISTS "Lead stages viewable by agency members" ON public.lead_stages;
CREATE POLICY "Lead stages viewable by agency members" ON public.lead_stages
  FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Lead stages insertable by agency members" ON public.lead_stages;
CREATE POLICY "Lead stages insertable by agency members" ON public.lead_stages
  FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Lead stages updatable by agency members" ON public.lead_stages;
CREATE POLICY "Lead stages updatable by agency members" ON public.lead_stages
  FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Lead stages deletable by agency members" ON public.lead_stages;
CREATE POLICY "Lead stages deletable by agency members" ON public.lead_stages
  FOR DELETE USING (public.is_agency_member(auth.uid(), agency_id));

-- Lead Activities
DROP POLICY IF EXISTS "Lead activities viewable by agency members" ON public.lead_activities;
CREATE POLICY "Lead activities viewable by agency members" ON public.lead_activities
  FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Lead activities insertable by agency members" ON public.lead_activities;
CREATE POLICY "Lead activities insertable by agency members" ON public.lead_activities
  FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Lead activities updatable by agency members" ON public.lead_activities;
CREATE POLICY "Lead activities updatable by agency members" ON public.lead_activities
  FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Lead activities deletable by agency members" ON public.lead_activities;
CREATE POLICY "Lead activities deletable by agency members" ON public.lead_activities
  FOR DELETE USING (public.is_agency_member(auth.uid(), agency_id));

-- 2. Políticas ausentes em user_roles
DROP POLICY IF EXISTS "User roles viewable by agency members" ON public.user_roles;
CREATE POLICY "User roles viewable by agency members" ON public.user_roles
  FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "User roles updatable by agency admins" ON public.user_roles;
CREATE POLICY "User roles updatable by agency admins" ON public.user_roles
  FOR ALL USING (public.can_manage_agency_finances(agency_id));

-- 3. Vazamento B2B em company_profiles e agency-media
-- O company_profiles tinha um `USING (true)` que vazava todas as agências.
-- Agora só vaza se is_published for true (embora essa flag n exista explicitamente em company_profiles, usaremos a verificação de se a agency tem status ativo).
-- Actually, agency subscriptions is the one with the status.
-- Let's replace the global USING (true) on company_profiles with a safer one.
DROP POLICY IF EXISTS "Profiles are public" ON public.company_profiles;
CREATE POLICY "Profiles are viewable by public if agency is active" ON public.company_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.agency_subscriptions s WHERE s.agency_id = company_profiles.agency_id AND s.status IN ('active', 'trialing'))
    OR public.is_agency_member(auth.uid(), agency_id)
  );

-- O agency-media bucket vazava arquivos
-- Para consertar storage, nós precisamos usar auth.uid() e storage.foldername(name)
DROP POLICY IF EXISTS "agency_media_public_read" ON storage.objects;
CREATE POLICY "agency_media_public_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'agency-media' 
    AND (
      -- Permitir acesso público se o tenant for ativo
      EXISTS (SELECT 1 FROM public.agency_subscriptions s WHERE s.agency_id::text = (storage.foldername(name))[1] AND s.status IN ('active', 'trialing'))
      OR
      -- Permitir se o arquivo tiver uma pasta genérica "public" dentro do agency_id
      (storage.foldername(name))[2] = 'public'
    )
  );

-- 4. Audit Log Restrição (Restringir apenas para admin da agência ou super_admin)
DROP POLICY IF EXISTS "Audit logs viewable by agency members" ON public.audit_log;
CREATE POLICY "Audit logs viewable by agency admins" ON public.audit_log
  FOR SELECT USING (
    public.can_manage_agency_finances(agency_id)
  );

-- 5. Função de bypass (SECURITY DEFINER) - fix search_path
-- Atualiza `get_crm_leads` (se existir) para search_path seguro
DROP FUNCTION IF EXISTS public.get_crm_leads(uuid);
CREATE OR REPLACE FUNCTION public.get_crm_leads(p_agency_id uuid)
RETURNS TABLE (
  id uuid,
  agency_id uuid,
  client_id uuid,
  title text,
  value numeric,
  stage_id uuid,
  status text,
  expected_close_date date,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify access
  IF NOT public.is_agency_member(auth.uid(), p_agency_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    l.id, l.agency_id, l.client_id, l.title, l.value, l.stage_id, l.status, l.expected_close_date, l.created_at, l.updated_at
  FROM leads l
  WHERE l.agency_id = p_agency_id
    AND l.deleted_at IS NULL;
END;
$$;
