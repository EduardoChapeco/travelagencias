-- ============================================================
-- Migração: dynamic_commissions
-- Criação de regras de comissão por agente e trigger
-- para cálculo seguro de comissões por viagem no servidor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_commission_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commission_type  text NOT NULL CHECK (commission_type IN ('scale', 'fixed')),
  fixed_pct        numeric(5,2) DEFAULT 0.00,
  scale_ranges     jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array de { "min": num, "max": num, "pct": num }
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id)
);

-- RLS para agent_commission_rules
ALTER TABLE public.agent_commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_rules" ON public.agent_commission_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin', agency_id))
  WITH CHECK (public.has_role(auth.uid(), 'agency_admin', agency_id));

CREATE POLICY "agents_read_own_rule" ON public.agent_commission_rules
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Trigger para updated_at em agent_commission_rules
CREATE TRIGGER agent_commission_rules_updated_at
  BEFORE UPDATE ON public.agent_commission_rules
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Alterar trip_commissions para colunas dinâmicas
ALTER TABLE public.trip_commissions
  ADD COLUMN IF NOT EXISTS items_commission jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_bonus numeric(12,2) NOT NULL DEFAULT 0.00;

-- Função de cálculo em trigger (BEFORE INSERT OR UPDATE)
CREATE OR REPLACE FUNCTION public.calculate_trip_commission_trigger_fn()
RETURNS trigger AS $$
DECLARE
  v_travel_month date;
  v_agent_monthly_billing numeric(12,2) := 0;
  v_rule public.agent_commission_rules%ROWTYPE;
  v_agent_pct numeric(5,2) := 3.00; -- default 3%
  v_item jsonb;
  v_tarifa_base numeric(12,2);
  v_taxas numeric(12,2);
  v_agency_pct numeric(5,2);
  v_item_bonus numeric(12,2);
  v_total_base numeric(12,2) := 0;
  v_total_agency_comm numeric(12,2) := 0;
  v_total_agent_comm numeric(12,2) := 0;
  v_total_bonus numeric(12,2) := 0;
  v_range jsonb;
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    -- Obter regra do agente
    SELECT * INTO v_rule
      FROM public.agent_commission_rules
     WHERE agency_id = NEW.agency_id AND user_id = NEW.agent_id;

    -- Calcular faturamento mensal do agente no mês da viagem (ou mês corrente)
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

    -- Determinar percentual do agente
    IF v_rule.id IS NOT NULL THEN
      IF v_rule.commission_type = 'fixed' THEN
        v_agent_pct := v_rule.fixed_pct;
      ELSE
        -- Lógica de escala personalizada
        v_agent_pct := 3.00; -- default
        FOR v_range IN SELECT * FROM jsonb_array_elements(v_rule.scale_ranges)
        LOOP
          IF v_agent_monthly_billing >= (v_range->>'min')::numeric AND 
             ((v_range->>'max') IS NULL OR v_agent_monthly_billing <= (v_range->>'max')::numeric) THEN
            v_agent_pct := (v_range->>'pct')::numeric;
          END IF;
        END LOOP;
      END IF;
    ELSE
      -- Escala fallback padrão: 0-50k (3%), 50k-100k (5%), 100k+ (7%)
      IF v_agent_monthly_billing >= 100000 THEN
        v_agent_pct := 7.00;
      ELSIF v_agent_monthly_billing >= 50000 THEN
        v_agent_pct := 5.00;
      ELSE
        v_agent_pct := 3.00;
      END IF;
    END IF;
  END IF;

  -- Iterar sobre os itens da comissão para calcular agência, agente e taxas
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items_commission)
  LOOP
    v_tarifa_base := COALESCE((v_item->>'tarifa_base')::numeric, 0);
    v_taxas := COALESCE((v_item->>'taxas')::numeric, 0);
    v_agency_pct := COALESCE((v_item->>'agency_commission_pct')::numeric, 15);
    v_item_bonus := COALESCE((v_item->>'bonus')::numeric, 0);

    -- Base de cálculo exclui as taxas de embarque
    v_total_base := v_total_base + v_tarifa_base;
    v_total_agency_comm := v_total_agency_comm + (v_tarifa_base * v_agency_pct / 100) + v_item_bonus;
    v_total_agent_comm := v_total_agent_comm + (v_tarifa_base * v_agent_pct / 100);
    v_total_bonus := v_total_bonus + v_item_bonus;
  END LOOP;

  -- Sobrescrever os campos calculados no NEW para persistência
  NEW.base_comissionavel    := v_total_base;
  NEW.agency_commission_brl := v_total_agency_comm;
  NEW.agent_commission_pct  := v_agent_pct;
  NEW.agent_commission_brl  := v_total_agent_comm;
  NEW.total_bonus           := v_total_bonus;
  NEW.net_profit            := v_total_agency_comm - v_total_agent_comm;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular antes de salvar
DROP TRIGGER IF EXISTS trip_commissions_calc_trigger ON public.trip_commissions;
CREATE TRIGGER trip_commissions_calc_trigger
  BEFORE INSERT OR UPDATE ON public.trip_commissions
  FOR EACH ROW EXECUTE FUNCTION public.calculate_trip_commission_trigger_fn();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_commission_rules TO authenticated;
GRANT ALL ON public.agent_commission_rules TO service_role;
