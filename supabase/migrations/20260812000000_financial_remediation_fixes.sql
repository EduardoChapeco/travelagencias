-- ============================================================
-- Migration: Financial Remediation Fixes (F001 - F005)
-- Fixes closed period lock deletes, revenue double entry,
-- and restrictions on RLS policies.
-- ============================================================

-- 1. Alter cash_transactions table to support links to trips and installments
ALTER TABLE public.cash_transactions 
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_installment_id uuid REFERENCES public.payment_installments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cash_transactions_trip ON public.cash_transactions(trip_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_installment ON public.cash_transactions(payment_installment_id);

-- 2. Correct enforce_closed_period_lock trigger function (Support DELETE operations)
CREATE OR REPLACE FUNCTION public.enforce_closed_period_lock()
RETURNS trigger AS $$
DECLARE
  v_date date;
  v_closed boolean := false;
  v_agency_id uuid;
BEGIN
  -- Resolve checking date and agency based on trigger operation
  IF TG_OP = 'DELETE' THEN
    v_agency_id := OLD.agency_id;
    IF TG_TABLE_NAME = 'financial_records' THEN
      v_date := COALESCE(OLD.due_date, OLD.created_at::date, CURRENT_DATE);
    ELSIF TG_TABLE_NAME = 'payment_installments' THEN
      v_date := COALESCE(OLD.due_date, CURRENT_DATE);
    ELSIF TG_TABLE_NAME = 'cash_transactions' THEN
      v_date := COALESCE(OLD.transaction_date::date, CURRENT_DATE);
    ELSIF TG_TABLE_NAME = 'financial_ledger_entries' THEN
      v_date := COALESCE(OLD.entry_date::date, CURRENT_DATE);
    ELSE
      v_date := CURRENT_DATE;
    END IF;
  ELSE
    v_agency_id := NEW.agency_id;
    IF TG_TABLE_NAME = 'financial_records' THEN
      v_date := COALESCE(NEW.due_date, NEW.created_at::date, CURRENT_DATE);
    ELSIF TG_TABLE_NAME = 'payment_installments' THEN
      v_date := COALESCE(NEW.due_date, CURRENT_DATE);
    ELSIF TG_TABLE_NAME = 'cash_transactions' THEN
      v_date := COALESCE(NEW.transaction_date::date, CURRENT_DATE);
    ELSIF TG_TABLE_NAME = 'financial_ledger_entries' THEN
      v_date := COALESCE(NEW.entry_date::date, CURRENT_DATE);
    ELSE
      v_date := CURRENT_DATE;
    END IF;
  END IF;

  -- Search for closed period
  SELECT EXISTS (
    SELECT 1 
    FROM public.monthly_closing_periods
    WHERE agency_id = v_agency_id
      AND year = date_part('year', v_date)
      AND month = date_part('month', v_date)
      AND status = 'closed'
  ) INTO v_closed;

  IF v_closed THEN
    RAISE EXCEPTION 'O período contábil (%-%) correspondente está fechado e bloqueado para alterações.', 
      date_part('year', v_date), date_part('month', v_date);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Correct sync_cash_transaction_to_ledger trigger function (Fix Double-Counting of Revenue)
CREATE OR REPLACE FUNCTION public.sync_cash_transaction_to_ledger()
RETURNS trigger AS $$
DECLARE
  v_debit_code text;
  v_credit_code text;
BEGIN
  -- Remove previous ledger entries for idempotency
  DELETE FROM public.financial_ledger_entries 
  WHERE source_event = 'cash_transaction' AND source_id = NEW.id;

  -- Map standard accounting codes
  IF NEW.type IN ('receipt', 'deposit') THEN
    -- Debit Asset (Caixa/Banco)
    v_debit_code := '1.1.1.01';   -- Ativo: Caixa/Equivalentes

    -- If this receipt is linked to a payment installment or trip, credit Accounts Receivable (1.1.2.01)
    -- otherwise credit Revenue (3.1.1.01)
    IF NEW.payment_installment_id IS NOT NULL OR NEW.trip_id IS NOT NULL THEN
      v_credit_code := '1.1.2.01';  -- Ativo: Clientes a Receber (liquidação)
    ELSE
      v_credit_code := '3.1.1.01';  -- Receitas operacionais
    END IF;

    INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
    VALUES (NEW.agency_id, v_debit_code, NEW.amount, 0.00, NEW.transaction_date, COALESCE(NEW.notes, 'Entrada de Caixa / Recibo'), 'cash_transaction', NEW.id);

    INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
    VALUES (NEW.agency_id, v_credit_code, 0.00, NEW.amount, NEW.transaction_date, COALESCE(NEW.notes, 'Contrapartida Recebimento'), 'cash_transaction', NEW.id);

  ELSIF NEW.type IN ('payment', 'withdrawal', 'vale') THEN
    -- Debit Expense/Liability offset, Credit Asset (Caixa/Banco)
    v_debit_code := '4.1.1.01';   -- Despesas operacionais
    v_credit_code := '1.1.1.01';  -- Ativo: Caixa/Equivalentes

    INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
    VALUES (NEW.agency_id, v_debit_code, NEW.amount, 0.00, NEW.transaction_date, COALESCE(NEW.notes, 'Saída de Caixa / Pagamento'), 'cash_transaction', NEW.id);

    INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
    VALUES (NEW.agency_id, v_credit_code, 0.00, NEW.amount, NEW.transaction_date, COALESCE(NEW.notes, 'Contrapartida Pagamento'), 'cash_transaction', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Harden cash_transactions RLS policies (Restrict DELETE/UPDATE to Admins)
DROP POLICY IF EXISTS "agency_cash_transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "cash_transactions_select" ON public.cash_transactions;
DROP POLICY IF EXISTS "cash_transactions_insert" ON public.cash_transactions;
DROP POLICY IF EXISTS "cash_transactions_update" ON public.cash_transactions;
DROP POLICY IF EXISTS "cash_transactions_delete" ON public.cash_transactions;

CREATE POLICY "cash_transactions_select" ON public.cash_transactions
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "cash_transactions_insert" ON public.cash_transactions
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "cash_transactions_update" ON public.cash_transactions
  FOR UPDATE TO authenticated USING (public.can_manage_agency_finances(agency_id));

CREATE POLICY "cash_transactions_delete" ON public.cash_transactions
  FOR DELETE TO authenticated USING (public.can_manage_agency_finances(agency_id));

-- 5. Harden payment_installments RLS policies (Allow Trip Owner Agents to update/check status)
DROP POLICY IF EXISTS "installments admin write" ON public.payment_installments;
DROP POLICY IF EXISTS "installments_admin_manage" ON public.payment_installments;
DROP POLICY IF EXISTS "installments_agent_update" ON public.payment_installments;

CREATE POLICY "installments_admin_manage" ON public.payment_installments
  FOR ALL TO authenticated USING (
    public.can_manage_agency_finances(
      (SELECT agency_id FROM public.payment_plans WHERE id = payment_installments.payment_plan_id)
    )
  );

CREATE POLICY "installments_agent_update" ON public.payment_installments
  FOR UPDATE TO authenticated
  USING (
    payment_plan_id IN (
      SELECT pp.id FROM public.payment_plans pp
      JOIN public.trips t ON t.id = pp.trip_id
      WHERE t.owner_id = auth.uid() AND public.is_agency_member(auth.uid(), t.agency_id)
    )
  )
  WITH CHECK (
    payment_plan_id IN (
      SELECT pp.id FROM public.payment_plans pp
      JOIN public.trips t ON t.id = pp.trip_id
      WHERE t.owner_id = auth.uid() AND public.is_agency_member(auth.uid(), t.agency_id)
    )
  );
