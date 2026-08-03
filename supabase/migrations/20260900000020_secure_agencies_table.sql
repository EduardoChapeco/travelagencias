-- =========================================================================================
-- Microfase 3: Autoridade Server-Side para Configurações do Tenant (Agencies)
-- Protege a tabela agencies e brand_kit contra alterações por agentes não-administradores,
-- e impede que até administradores modifiquem colunas sistêmicas (status, slug).
-- =========================================================================================

-- 1. Substituir a política de Update da tabela agencies para exigir agency_admin
DROP POLICY IF EXISTS "agency members can update their agency" ON public.agencies;

CREATE POLICY "agency admins can update their agency"
  ON public.agencies FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin', id))
  WITH CHECK (public.has_role(auth.uid(), 'agency_admin', id));

-- 2. Trigger para bloquear atualizações diretas de colunas sistêmicas por qualquer tenant
CREATE OR REPLACE FUNCTION public.protect_agencies_system_columns()
RETURNS trigger AS $$
BEGIN
  -- Se o usuário não for postgres ou supabase_admin, ele não pode mexer em dados sistêmicos
  IF current_user NOT IN ('postgres', 'supabase_admin') THEN
    NEW.status = OLD.status;
    NEW.slug = OLD.slug;
    -- Se houver plano de assinatura na tabela, proteja aqui
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_agencies_system_columns ON public.agencies;
CREATE TRIGGER trg_protect_agencies_system_columns
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_agencies_system_columns();

-- 3. Atualizar política de Update da tabela brand_kit (caso exista)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brand_kit') THEN
        DROP POLICY IF EXISTS "agency members can update brand kit" ON public.brand_kit;
        DROP POLICY IF EXISTS "brand_kit update" ON public.brand_kit;
        
        -- Garante que apenas admin possa alterar a marca
        CREATE POLICY "agency admins can update brand kit"
          ON public.brand_kit FOR UPDATE
          TO authenticated
          USING (public.has_role(auth.uid(), 'agency_admin', agency_id))
          WITH CHECK (public.has_role(auth.uid(), 'agency_admin', agency_id));
    END IF;
END
$$;
