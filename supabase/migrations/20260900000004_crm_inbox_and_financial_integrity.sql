-- Migration: 20260900000004_crm_inbox_and_financial_integrity.sql
-- Goal: Add explicit CRM linkages to contacts, harden audit logs insertion, and restrict cash transaction additions to open registers.

-- 1. Add lead_id and client_id to public.contacts table
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_lead ON public.contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client ON public.contacts(client_id);

-- 2. Harden public.audit_log table to prevent actor spoofing from frontend
DROP POLICY IF EXISTS "audit insert" ON public.audit_log;

CREATE POLICY "audit insert" ON public.audit_log 
  FOR INSERT TO authenticated 
  WITH CHECK (
    agency_id IS NOT NULL 
    AND public.is_agency_member(auth.uid(), agency_id)
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );

-- 3. Block cash transaction inputs if cash register is not open
CREATE OR REPLACE FUNCTION public.verify_cash_register_open_before_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text;
BEGIN
  SELECT status INTO _status FROM public.cash_registers WHERE id = NEW.cash_register_id;
  IF _status IS NULL THEN
    RAISE EXCEPTION 'Caixa registradora não encontrada.';
  ELSIF _status <> 'open' THEN
    RAISE EXCEPTION 'Não é permitido realizar transações em um caixa fechado ou inativo.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_cash_register_open ON public.cash_transactions;
CREATE TRIGGER trg_verify_cash_register_open
  BEFORE INSERT ON public.cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_cash_register_open_before_transaction();
