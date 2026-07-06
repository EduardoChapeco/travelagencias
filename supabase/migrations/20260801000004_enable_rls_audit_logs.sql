-- Migration: 20260801000004_enable_rls_audit_logs.sql
-- Purpose: Habilitar RLS na tabela audit_logs (CVE-2025-48757)
-- A tabela audit_logs estava com rowsecurity=false, expondo todos os logs de auditoria
-- financeira a qualquer chave anon/authenticated sem restrição.

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: apenas membros da agência com role admin ou owner
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.agency_id = public.audit_logs.agency_id
        AND ur.role IN ('agency_admin', 'super_admin')
    )
  );

-- INSERT: bloqueado para authenticated — a tabela é escrita APENAS por triggers
-- (SECURITY DEFINER) que usam service_role internamente.
-- Não criamos policy de INSERT: qualquer tentativa de insert direto pelo client
-- será rejeitada pelo RLS.

-- Grant mínimo de SELECT para usuários autenticados (filtrado pela policy acima)
GRANT SELECT ON public.audit_logs TO authenticated;
