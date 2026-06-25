-- ============================================================
-- Migration: Ledger Double-Entry Triggers (Phase P2)
-- Automatically generate debit and credit rows in
-- financial_ledger_entries on cash transactions and accruals.
-- ============================================================

-- 1. Trigger Function for cash_transactions
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
    -- Debit Asset (Caixa/Banco), Credit Revenue offset
    v_debit_code := '1.1.1.01';   -- Ativo: Caixa/Equivalentes
    v_credit_code := '3.1.1.01';  -- Receitas operacionais

    INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
    VALUES (NEW.agency_id, v_debit_code, NEW.amount, 0.00, NEW.transaction_date, COALESCE(NEW.notes, 'Entrada de Caixa / Recibo'), 'cash_transaction', NEW.id);

    INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
    VALUES (NEW.agency_id, v_credit_code, 0.00, NEW.amount, NEW.transaction_date, COALESCE(NEW.notes, 'Contrapartida Recebimento / Vendas'), 'cash_transaction', NEW.id);

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

-- Bind trigger to cash_transactions
DROP TRIGGER IF EXISTS trg_sync_cash_transaction_to_ledger ON public.cash_transactions;
CREATE TRIGGER trg_sync_cash_transaction_to_ledger
  AFTER INSERT OR UPDATE ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_cash_transaction_to_ledger();

-- Also handle transaction deletes from ledger
CREATE OR REPLACE FUNCTION public.sync_cash_transaction_delete_to_ledger()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.financial_ledger_entries 
  WHERE source_event = 'cash_transaction' AND source_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_cash_transaction_delete ON public.cash_transactions;
CREATE TRIGGER trg_sync_cash_transaction_delete
  AFTER DELETE ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_cash_transaction_delete_to_ledger();


-- 2. Trigger Function for financial_records (accruals)
CREATE OR REPLACE FUNCTION public.sync_financial_record_to_ledger()
RETURNS trigger AS $$
DECLARE
  v_debit_code text;
  v_credit_code text;
  v_amount numeric;
BEGIN
  -- Remove previous ledger entries for idempotency
  DELETE FROM public.financial_ledger_entries 
  WHERE source_event = 'financial_record' AND source_id = NEW.id;

  v_amount := COALESCE(NEW.amount_brl, NEW.amount, 0.00);

  -- We only record in ledger if status is confirmed (realized/accrued)
  IF NEW.status = 'confirmed' AND v_amount > 0 THEN
    IF NEW.type = 'income' THEN
      v_debit_code := '1.1.2.01';   -- Clientes a Receber (Ativo)
      v_credit_code := '3.1.1.01';  -- Receita de Vendas (Resultado)

      INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
      VALUES (NEW.agency_id, v_debit_code, v_amount, 0.00, COALESCE(NEW.due_date, NEW.created_at::date), COALESCE(NEW.notes, 'Provisão Contábil - Contas a Receber'), 'financial_record', NEW.id);

      INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
      VALUES (NEW.agency_id, v_credit_code, 0.00, v_amount, COALESCE(NEW.due_date, NEW.created_at::date), COALESCE(NEW.notes, 'Provisão Contábil - Contrapartida Receita'), 'financial_record', NEW.id);

    ELSIF NEW.type = 'expense' THEN
      v_debit_code := '4.1.1.01';   -- Despesas operacionais (Resultado)
      v_credit_code := '2.1.1.01';  -- Fornecedores a Pagar (Passivo)

      INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
      VALUES (NEW.agency_id, v_debit_code, v_amount, 0.00, COALESCE(NEW.due_date, NEW.created_at::date), COALESCE(NEW.notes, 'Provisão Contábil - Despesa Registrada'), 'financial_record', NEW.id);

      INSERT INTO public.financial_ledger_entries (agency_id, account_code, debit_amount, credit_amount, entry_date, description, source_event, source_id)
      VALUES (NEW.agency_id, v_credit_code, 0.00, v_amount, COALESCE(NEW.due_date, NEW.created_at::date), COALESCE(NEW.notes, 'Provisão Contábil - Contrapartida Passivo'), 'financial_record', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to financial_records
DROP TRIGGER IF EXISTS trg_sync_financial_record_to_ledger ON public.financial_records;
CREATE TRIGGER trg_sync_financial_record_to_ledger
  AFTER INSERT OR UPDATE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.sync_financial_record_to_ledger();

-- Also handle record deletes from ledger
CREATE OR REPLACE FUNCTION public.sync_financial_record_delete_to_ledger()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.financial_ledger_entries 
  WHERE source_event = 'financial_record' AND source_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_financial_record_delete ON public.financial_records;
CREATE TRIGGER trg_sync_financial_record_delete
  AFTER DELETE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.sync_financial_record_delete_to_ledger();
