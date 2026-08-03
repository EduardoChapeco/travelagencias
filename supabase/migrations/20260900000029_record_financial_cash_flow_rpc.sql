-- =============================================================================
-- MICROFASE F-003: RPC record_financial_cash_flow
--
-- PROBLEMA: Em src/services/trips.ts, três funções (addFinancialRecord,
-- confirmFinancialRecord, markInstallmentPaid) inseriam em cash_transactions
-- usando "(supabase as any).from('cash_transactions').insert({})" — indicando
-- que a tabela não estava nos tipos gerados do Supabase (supabase.ts).
-- Além disso, a lógica de seleção do caixa ativo era duplicada em 3 lugares.
--
-- SOLUÇÃO: RPC SECURITY DEFINER que:
--   1. Verifica autenticação e membership
--   2. Encontra o caixa correto (físico aberto > banco > primeiro)
--   3. Registra a transação de caixa atomicamente
--   4. Elimina código duplicado de 3 locais do service layer
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_financial_cash_flow(
  p_agency_id          uuid,
  p_trip_id            uuid,
  p_amount             numeric,
  p_type               text,   -- 'receipt' | 'payment' | 'withdrawal' | 'deposit'
  p_payment_method     text,
  p_notes              text DEFAULT NULL,
  p_installment_id     uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   uuid;
  v_target_reg  uuid;
  v_target_sess uuid;
  v_sess        record;
  v_reg         record;
  v_tx_id       uuid;
BEGIN
  -- 1. Auth check
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- 2. Verify agency membership
  IF NOT public.is_agency_member(v_caller_id, p_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: not a member of agency %', p_agency_id;
  END IF;

  -- 3. Find active cash register: prefer open physical session, fall back to bank account
  SELECT cs.id AS session_id, cs.cash_register_id
  INTO v_target_sess, v_target_reg
  FROM public.cash_sessions cs
  JOIN public.cash_registers cr ON cr.id = cs.cash_register_id
  WHERE cr.agency_id = p_agency_id
    AND cr.is_active = true
    AND cr.type = 'physical'
    AND cs.status = 'open'
  ORDER BY cs.opened_at DESC
  LIMIT 1;

  -- Fall back to bank account if no open physical session
  IF v_target_reg IS NULL THEN
    SELECT id INTO v_target_reg
    FROM public.cash_registers
    WHERE agency_id = p_agency_id
      AND is_active = true
      AND type = 'bank_account'
    LIMIT 1;
  END IF;

  -- Final fallback: any active register
  IF v_target_reg IS NULL THEN
    SELECT id INTO v_target_reg
    FROM public.cash_registers
    WHERE agency_id = p_agency_id
      AND is_active = true
    LIMIT 1;
  END IF;

  -- 4. If no register at all, skip silently (agency has no cash module configured)
  IF v_target_reg IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'no_active_register');
  END IF;

  -- 5. Insert the cash transaction
  INSERT INTO public.cash_transactions (
    agency_id, cash_register_id, cash_session_id, trip_id,
    payment_installment_id, amount, type, payment_method,
    notes, transaction_date
  )
  VALUES (
    p_agency_id, v_target_reg, v_target_sess, p_trip_id,
    p_installment_id, p_amount, p_type, p_payment_method,
    p_notes, NOW()
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'recorded',         true,
    'transaction_id',   v_tx_id,
    'cash_register_id', v_target_reg,
    'cash_session_id',  v_target_sess
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Non-fatal: cash flow recording failure should not block the financial record update
    -- Callers should log this but not throw to the user
    RETURN jsonb_build_object('recorded', false, 'reason', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_financial_cash_flow(uuid, uuid, numeric, text, text, text, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.record_financial_cash_flow IS
  'Server-side cash flow registration with intelligent register selection.
   Replaces (supabase as any).from("cash_transactions").insert() pattern
   scattered across trips.ts service layer. Non-fatal on failure.
   Microfase F-003 — 2026-08-03';
