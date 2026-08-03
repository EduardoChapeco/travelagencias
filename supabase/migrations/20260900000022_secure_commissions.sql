-- =========================================================================================
-- Microfase 5: Autoridade e Prevenção de Fraude em Comissionamentos (Trip Commissions)
-- Impede que um agente injete um array JSON de `items_commission` cujo valor total
-- (tarifa base) exceda o valor real de venda da viagem, fraudando a comissão a receber.
-- =========================================================================================

CREATE OR REPLACE FUNCTION public.trg_trip_commissions_calculate()
RETURNS trigger AS $$
DECLARE
  v_agent_monthly_billing numeric(12,2) := 0;
  v_travel_month date;
  v_item jsonb;
  v_tarifa_base numeric(12,2);
  v_agency_pct numeric(5,2);
  v_item_bonus numeric(12,2);
  v_total_base numeric(12,2) := 0;
  v_total_agency_comm numeric(12,2) := 0;
  v_total_agent_comm numeric(12,2) := 0;
  v_total_bonus numeric(12,2) := 0;
  v_res json;
  v_trip_total_sale numeric(12,2) := 0;
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    -- Get faturamento month and total sale
    SELECT travel_start, COALESCE(total_sale, 0) INTO v_travel_month, v_trip_total_sale 
    FROM public.trips WHERE id = NEW.trip_id;
    
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
  
  -- FRAUD PREVENTION: The total comissionable base cannot exceed the trip's real sale price
  IF NEW.agent_id IS NOT NULL AND v_total_base > v_trip_total_sale THEN
    RAISE EXCEPTION 'Operação Rejeitada: A tarifa base declarada (R$ %) excede o valor de venda real da viagem (R$ %). (Risco de Fraude de Comissão)', v_total_base, v_trip_total_sale;
  END IF;

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

-- Bind the updated trigger to trip_commissions (replacing any previous binding)
DROP TRIGGER IF EXISTS trg_trip_commissions_calculate ON public.trip_commissions;
CREATE TRIGGER trg_trip_commissions_calculate
  BEFORE INSERT OR UPDATE ON public.trip_commissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_trip_commissions_calculate();
