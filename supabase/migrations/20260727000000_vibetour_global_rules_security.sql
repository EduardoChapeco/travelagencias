-- Migration: 20260727000000_vibetour_global_rules_security.sql
-- Description: Separação estrita de privilégios de escrita para regras e perfis globais (somente super_admin) vs locais da agência

-- 1. Tabela: score_profiles
-- Dropar a política genérica existente
DROP POLICY IF EXISTS score_profiles_all ON public.score_profiles;

-- Criar política de leitura (Select)
CREATE POLICY score_profiles_select ON public.score_profiles
  FOR SELECT TO authenticated
  USING (
    scope = 'global' OR public.is_agency_member(auth.uid(), agency_id)
  );

-- Criar política de escrita (Insert, Update, Delete)
CREATE POLICY score_profiles_write ON public.score_profiles
  FOR ALL TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'agency' AND public.is_agency_member(auth.uid(), agency_id))
  )
  WITH CHECK (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'agency' AND public.is_agency_member(auth.uid(), agency_id))
  );


-- 2. Tabela: decision_rules
-- Dropar a política genérica existente
DROP POLICY IF EXISTS decision_rules_all ON public.decision_rules;

-- Criar política de leitura (Select)
CREATE POLICY decision_rules_select ON public.decision_rules
  FOR SELECT TO authenticated
  USING (
    scope = 'global' OR public.is_agency_member(auth.uid(), agency_id)
  );

-- Criar política de escrita (Insert, Update, Delete)
CREATE POLICY decision_rules_write ON public.decision_rules
  FOR ALL TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'agency' AND public.is_agency_member(auth.uid(), agency_id))
  )
  WITH CHECK (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'agency' AND public.is_agency_member(auth.uid(), agency_id))
  );


-- 3. Tabela: decision_rule_versions
-- Dropar a política genérica existente
DROP POLICY IF EXISTS rule_versions_all ON public.decision_rule_versions;

-- Criar política de leitura (Select)
CREATE POLICY rule_versions_select ON public.decision_rule_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decision_rules r
      WHERE r.id = rule_id AND (r.scope = 'global' OR public.is_agency_member(auth.uid(), r.agency_id))
    )
  );

-- Criar política de escrita (Insert, Update, Delete)
CREATE POLICY rule_versions_write ON public.decision_rule_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.decision_rules r
      WHERE r.id = rule_id AND (
        (r.scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
        OR (r.scope = 'agency' AND public.is_agency_member(auth.uid(), r.agency_id))
      )
    )
  );
