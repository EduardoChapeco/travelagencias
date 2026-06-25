-- ============================================================
-- Migration: Stored Procedures & Locking Controls (Phase 2)
-- Implement progressive commission resolution, integration with
-- commission plans, and closed period change prevention.
-- ============================================================

-- 1. Progressive Commission Scale calculator
CREATE OR REPLACE FUNCTION public.calculate_progressive_commission(
  _billing numeric,
  _ranges jsonb
) RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_range jsonb;
  v_comm numeric := 0;
  v_min numeric;
  v_max numeric;
  v_pct numeric;
  v_applicable numeric;
BEGIN
  FOR v_range IN SELECT * FROM jsonb_array_elements(_ranges)
  LOOP
    v_min := COALESCE((v_range->>'min')::numeric, 0.00);
    v_max := (v_range->>'max')::numeric;
    v_pct := COALESCE((v_range->>'pct')::numeric, 0.00);

    IF _billing > v_min THEN
      IF v_max IS NULL OR _billing <= v_max THEN
        v_applicable := _billing - v_min;
      ELSE
        v_applicable := v_max - v_min;
      END IF;
      v_comm := v_comm + (v_applicable * v_pct / 100);
    END IF;
  END LOOP;

  RETURN ROUND(v_comm, 2);
END;
$$;

-- 2. Resolver for Agent Commission
CREATE OR REPLACE FUNCTION public.resolve_agent_commission(
  p_agency_id uuid,
  p_agent_id uuid,
  p_monthly_billing numeric,
  p_base_amount numeric
) RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_plan public.seller_commission_plans%ROWTYPE;
  v_pct numeric := 3.00; -- Default fallback
  v_amount numeric := 0.00;
  v_range jsonb;
  v_ranges jsonb;
BEGIN
  -- Search for active plan for this seller
  SELECT * INTO v_plan
  FROM public.seller_commission_plans
  WHERE agency_id = p_agency_id
    AND seller_id = p_agent_id
    AND status = 'active'
    AND valid_from <= CURRENT_DATE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY version DESC
  LIMIT 1;

  IF v_plan.id IS NOT NULL THEN
    -- If using fixed commission
    IF v_plan.tier_mode = 'integral' AND NOT EXISTS (SELECT 1 FROM public.seller_commission_tiers WHERE plan_id = v_plan.id) THEN
      v_pct := 3.00; -- Fallback rate if no tiers
      v_amount := ROUND(p_base_amount * v_pct / 100, 2);
    ELSIF v_plan.tier_mode = 'integral' THEN
      -- Get highest matching tier rate (Integral mode)
      SELECT commission_rate INTO v_pct
      FROM public.seller_commission_tiers
      WHERE plan_id = v_plan.id
        AND p_monthly_billing >= minimum_volume
        AND (maximum_volume IS NULL OR p_monthly_billing <= maximum_volume)
      ORDER BY minimum_volume DESC
      LIMIT 1;
      
      IF v_pct IS NULL THEN
        v_pct := 3.00; -- default fallback
      END IF;
      v_amount := ROUND(p_base_amount * v_pct / 100, 2);
    ELSE
      -- Progressive mode (Bracket rate calculation)
      -- Load all tiers for the plan into a jsonb array
      SELECT jsonb_agg(jsonb_build_object('min', minimum_volume, 'max', maximum_volume, 'pct', commission_rate))
      INTO v_ranges
      FROM public.seller_commission_tiers
      WHERE plan_id = v_plan.id;

      -- Resolve total commission amount on total billing
      v_amount := public.calculate_progressive_commission(p_monthly_billing + p_base_amount, v_ranges) - 
                  public.calculate_progressive_commission(p_monthly_billing, v_ranges);
      
      -- Set equivalent dynamic percentage
      IF p_base_amount > 0 THEN
        v_pct := ROUND((v_amount / p_base_amount) * 100, 2);
      ELSE
        v_pct := 0.00;
      END IF;
    END IF;
  ELSE
    -- Fallback default scale: 0-50k (3%), 50k-100k (5%), 100k+ (7%) - Integral
    IF p_monthly_billing >= 100000 THEN
      v_pct := 7.00;
    ELSIF p_monthly_billing >= 50000 THEN
      v_pct := 5.00;
    ELSE
      v_pct := 3.00;
    END IF;
    v_amount := ROUND(p_base_amount * v_pct / 100, 2);
  END IF;

  RETURN json_build_object(
    'commission_rate', v_pct,
    'commission_amount', v_amount
  );
END;
$$;

-- 3. Update trigger function for trip commissions to call the resolver
CREATE OR REPLACE FUNCTION public.calculate_trip_commission_trigger_fn()
RETURNS trigger AS $$
DECLARE
  v_travel_month date;
  v_agent_monthly_billing numeric(12,2) := 0;
  v_item jsonb;
  v_tarifa_base numeric(12,2);
  v_taxas numeric(12,2);
  v_agency_pct numeric(5,2);
  v_item_bonus numeric(12,2);
  v_total_base numeric(12,2) := 0;
  v_total_agency_comm numeric(12,2) := 0;
  v_total_agent_comm numeric(12,2) := 0;
  v_total_bonus numeric(12,2) := 0;
  v_res json;
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    -- Get faturamento month
    SELECT travel_start INTO v_travel_month FROM public.trips WHERE id = NEW.trip_id;
    IF v_travel_month IS NULL THEN
      v_travel_month := CURRENT_DATE;
    END IF;
    
    SELECT COALESCE(SUM(tc.base_comissionavel), 0)
      INTO v_agent_monthly_billing
      FROM public.trip_commissions tc
      JOIN public.trips t ON t.id = tc.trip_id
     WHERE tc.agent_id = NEW.agent_id
       AND t.status IN ('confirmed', 'completed')
       AND t.travel_start >= date_trunc('month', v_travel_month)
       AND t.travel_start < date_trunc('month', v_travel_month) + interval '1 month'
       AND t.id <> NEW.trip_id;
  END IF;

  -- Accumulate items first to get current trip base amount
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items_commission)
  LOOP
    v_tarifa_base := COALESCE((v_item->>'tarifa_base')::numeric, 0);
    v_agency_pct := COALESCE((v_item->>'agency_commission_pct')::numeric, 15);
    v_item_bonus := COALESCE((v_item->>'bonus')::numeric, 0);

    v_total_base := v_total_base + v_tarifa_base;
    v_total_agency_comm := v_total_agency_comm + (v_tarifa_base * v_agency_pct / 100) + v_item_bonus;
    v_total_bonus := v_total_bonus + v_item_bonus;
  END LOOP;

  -- Resolve agent commission with the calculated base amount
  IF NEW.agent_id IS NOT NULL THEN
    v_res := public.resolve_agent_commission(NEW.agency_id, NEW.agent_id, v_agent_monthly_billing, v_total_base);
    NEW.agent_commission_pct := (v_res->>'commission_rate')::numeric;
    NEW.agent_commission_brl := (v_res->>'commission_amount')::numeric;
  ELSE
    NEW.agent_commission_pct := 0.00;
    NEW.agent_commission_brl := 0.00;
  END IF;

  NEW.base_comissionavel    := v_total_base;
  NEW.agency_commission_brl := v_total_agency_comm;
  NEW.total_bonus           := v_total_bonus;
  NEW.net_profit            := v_total_agency_comm - NEW.agent_commission_brl;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Closed Period Locking prevention
CREATE OR REPLACE FUNCTION public.enforce_closed_period_lock()
RETURNS trigger AS $$
DECLARE
  v_date date;
  v_closed boolean := false;
BEGIN
  -- Resolve checking date based on triggering table
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

  -- Search for closed period
  SELECT EXISTS (
    SELECT 1 
    FROM public.monthly_closing_periods
    WHERE agency_id = COALESCE(NEW.agency_id, OLD.agency_id)
      AND year = date_part('year', v_date)
      AND month = date_part('month', v_date)
      AND status = 'closed'
  ) INTO v_closed;

  IF v_closed THEN
    RAISE EXCEPTION 'O período contábil (%-%) correspondente está fechado e bloqueado para alterações.', 
      date_part('year', v_date), date_part('month', v_date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Bind Lock Trigger to tables
DROP TRIGGER IF EXISTS trg_lock_financial_records ON public.financial_records;
CREATE TRIGGER trg_lock_financial_records
  BEFORE INSERT OR UPDATE OR DELETE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_closed_period_lock();

DROP TRIGGER IF EXISTS trg_lock_payment_installments ON public.payment_installments;
CREATE TRIGGER trg_lock_payment_installments
  BEFORE INSERT OR UPDATE OR DELETE ON public.payment_installments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_closed_period_lock();

DROP TRIGGER IF EXISTS trg_lock_cash_transactions ON public.cash_transactions;
CREATE TRIGGER trg_lock_cash_transactions
  BEFORE INSERT OR UPDATE OR DELETE ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_closed_period_lock();

DROP TRIGGER IF EXISTS trg_lock_financial_ledger_entries ON public.financial_ledger_entries;
CREATE TRIGGER trg_lock_financial_ledger_entries
  BEFORE INSERT OR UPDATE OR DELETE ON public.financial_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_closed_period_lock();
