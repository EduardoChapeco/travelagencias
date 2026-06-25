-- ================================================================
-- Migration: 20260724000000_omnichannel_and_cash_audit.sql
-- Fase 4: Idempotência de Mensagens & Auditoria do Caixa
-- Data: 2026-07-24
--
-- Objetivo:
-- 1. Resolver a falta de idempotência nos webhooks do WhatsApp
--    adicionando um índice de chave exclusiva na coluna `external_message_id`.
-- 2. Implementar logs físicos automáticos e invioláveis (triggers)
--    para auditoria das tabelas `cash_sessions` e `cash_transactions`
--    no nível de Agência Admin / Super Admin.
-- ================================================================

-- ─── 1. Idempotência / Deduplicação de WhatsApp ──────────────────
-- Criar índice de unicidade parcial para garantir que o mesmo external_message_id
-- não seja inserido mais de uma vez para evitar disparos/recebimentos duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS omnichannel_messages_external_id_uidx
  ON public.omnichannel_messages(external_message_id)
  WHERE external_message_id IS NOT NULL;

COMMENT ON INDEX public.omnichannel_messages_external_id_uidx IS
  'Garante a idempotência das mensagens recebidas e enviadas por canais omnichannel evitando duplicados de webhooks.';


-- ─── 2. Tabela de Logs de Auditoria do Caixa ─────────────────────
CREATE TABLE IF NOT EXISTS public.cash_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Ativar RLS para segurança rígida
ALTER TABLE public.cash_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para leitura restrita a agência admins e super admins
DROP POLICY IF EXISTS "cash_audit_logs_select" ON public.cash_audit_logs;
CREATE POLICY "cash_audit_logs_select" ON public.cash_audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'agency_admin'::public.app_role, agency_id)
  );

-- Comentários de documentação
COMMENT ON TABLE public.cash_audit_logs IS
  'Logs de auditoria física para controle de alteração e modificação de caixas por operadores da agência.';


-- ─── 3. Trigger de Auditoria de Modificações do Caixa ────────────
CREATE OR REPLACE FUNCTION public.process_cash_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_old_data jsonb := null;
  v_new_data jsonb := null;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_agency_id := OLD.agency_id;
    v_old_data := row_to_json(OLD)::jsonb;
  ELSE
    v_agency_id := NEW.agency_id;
    v_new_data := row_to_json(NEW)::jsonb;
    IF TG_OP = 'UPDATE' THEN
      v_old_data := row_to_json(OLD)::jsonb;
    END IF;
  END IF;

  INSERT INTO public.cash_audit_logs (
    agency_id,
    operator_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  ) VALUES (
    v_agency_id,
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_old_data,
    v_new_data
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


-- ─── 4. Associar Triggers às Tabelas do Caixa ────────────────────

-- Triggers para cash_sessions
DROP TRIGGER IF EXISTS audit_cash_sessions_trigger ON public.cash_sessions;
CREATE TRIGGER audit_cash_sessions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.process_cash_audit_log();

-- Triggers para cash_transactions
DROP TRIGGER IF EXISTS audit_cash_transactions_trigger ON public.cash_transactions;
CREATE TRIGGER audit_cash_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.process_cash_audit_log();

-- Conceder privilégios
GRANT SELECT ON public.cash_audit_logs TO authenticated;
GRANT ALL ON public.cash_audit_logs TO service_role;
