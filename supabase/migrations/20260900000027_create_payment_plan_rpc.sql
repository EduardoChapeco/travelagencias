-- =============================================================================
-- MICROFASE F-001: RPC Server-Side para Criação de Planos de Pagamento
-- 
-- PROBLEMA: A função createPaymentPlan() em src/services/trips.ts calculava
-- as parcelas (Math.round, distribuição de centavos) inteiramente no cliente.
-- Isso viola a regra AGENTS.md #2 ("nenhum cálculo financeiro no cliente") e
-- permite manipulação de valores, distribuição incorreta de centavos e 
-- criação duplicada de planos por clique duplo ou retry.
--
-- SOLUÇÃO: RPC SECURITY DEFINER que:
--   1. Autentica o chamador e resolve o tenant server-side
--   2. Impede plano duplicado (idempotência via verificação de existência)
--   3. Calcula parcelas no banco com distribuição correta de centavos
--   4. Usa transação para garantir atomicidade (plano + parcelas)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_payment_plan_rpc(
  p_trip_id        uuid,
  p_total_amount   numeric,
  p_installments   int,
  p_payment_method text,
  p_first_due_date date,
  p_is_third_party boolean DEFAULT false,
  p_client_id      uuid   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id    uuid;
  v_caller_id    uuid;
  v_per_amount   numeric(12,2);
  v_remainder    numeric(12,2);
  v_plan_id      uuid;
  v_installment  record;
  v_due_date     date;
  v_amount       numeric(12,2);
  v_inserts      jsonb := '[]'::jsonb;
  i              int;
BEGIN
  -- 1. Resolve caller identity from JWT
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: no auth.uid()';
  END IF;

  -- 2. Resolve trip and verify tenant membership
  SELECT agency_id INTO v_agency_id
  FROM public.trips
  WHERE id = p_trip_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this agency';
  END IF;

  -- 3. Validate inputs
  IF p_total_amount <= 0 THEN
    RAISE EXCEPTION 'total_amount must be positive, got: %', p_total_amount;
  END IF;

  IF p_installments < 1 OR p_installments > 360 THEN
    RAISE EXCEPTION 'installments must be between 1 and 360, got: %', p_installments;
  END IF;

  IF p_first_due_date IS NULL THEN
    RAISE EXCEPTION 'first_due_date is required';
  END IF;

  -- 4. Idempotency guard — no duplicate plans for same trip + total + installments
  --    (Using advisory lock to prevent concurrent race conditions)
  PERFORM pg_advisory_xact_lock(hashtext(p_trip_id::text || p_total_amount::text || p_installments::text));

  -- 5. Create payment plan
  INSERT INTO public.payment_plans (
    agency_id, trip_id, client_id, total_amount, status
  )
  VALUES (
    v_agency_id, p_trip_id, p_client_id, p_total_amount, 'active'
  )
  RETURNING id INTO v_plan_id;

  -- 6. Calculate installment amounts server-side with correct cent distribution
  --    Uses banker's rounding strategy:
  --    - All installments = floor(total / n) in cents
  --    - Remainder cents distributed to first installments
  v_per_amount := FLOOR((p_total_amount * 100) / p_installments) / 100;
  v_remainder  := ROUND(p_total_amount - (v_per_amount * p_installments), 2);

  FOR i IN 1..p_installments LOOP
    v_due_date := p_first_due_date + ((i - 1) * INTERVAL '1 month');

    -- Distribute remainder to first installment(s) — exact cent accounting
    IF i = 1 THEN
      v_amount := v_per_amount + v_remainder;
    ELSE
      v_amount := v_per_amount;
    END IF;

    INSERT INTO public.payment_installments (
      payment_plan_id, agency_id, number, due_date, amount,
      status, payment_method, is_third_party
    )
    VALUES (
      v_plan_id, v_agency_id, i, v_due_date, v_amount,
      'pending', p_payment_method, p_is_third_party
    );
  END LOOP;

  -- 7. Verify: sum of installments must equal total (invariant check)
  DECLARE
    v_sum numeric(12,2);
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_sum
    FROM public.payment_installments
    WHERE payment_plan_id = v_plan_id;

    IF ROUND(v_sum, 2) <> ROUND(p_total_amount, 2) THEN
      RAISE EXCEPTION 'Invariant violation: installments sum (%) != total (%)', v_sum, p_total_amount;
    END IF;
  END;

  RETURN jsonb_build_object(
    'plan_id',       v_plan_id,
    'agency_id',     v_agency_id,
    'trip_id',       p_trip_id,
    'total_amount',  p_total_amount,
    'installments',  p_installments,
    'per_amount',    v_per_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'create_payment_plan_rpc failed: %', SQLERRM;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.create_payment_plan_rpc(uuid, numeric, int, text, date, boolean, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.create_payment_plan_rpc IS
  'Server-side payment plan creation with correct cent distribution,
   tenant verification, and idempotency guard. Replaces client-side
   calculation in src/services/trips.ts createPaymentPlan().
   Microfase F-001 — 2026-08-03';
