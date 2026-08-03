-- =========================================================================================
-- Microfase 2: Autoridade Server-Side para Financeiro de Grupos (Excursões)
-- Evita que o frontend sobrescreva pricing_tiers, ads_budget e target_poupanca_balance 
-- via API REST padrão, exigindo o uso de RPC.
-- =========================================================================================

-- 1. Trigger para bloquear atualizações diretas
CREATE OR REPLACE FUNCTION public.protect_group_tours_financials()
RETURNS trigger AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin') THEN
    NEW.pricing_tiers = OLD.pricing_tiers;
    NEW.ads_budget = OLD.ads_budget;
    NEW.target_poupanca_balance = OLD.target_poupanca_balance;
    NEW.extra_options = OLD.extra_options;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_group_tours_financials ON public.group_tours;
CREATE TRIGGER trg_protect_group_tours_financials
  BEFORE UPDATE ON public.group_tours
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_group_tours_financials();

-- 2. RPC Segura para atualização de Tiers (Preços)
CREATE OR REPLACE FUNCTION public.update_group_tour_pricing(
  p_tour_id uuid,
  p_pricing_tiers jsonb,
  p_extra_options jsonb
)
RETURNS void AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  SELECT agency_id INTO v_agency_id FROM public.group_tours WHERE id = p_tour_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Grupo não encontrado.'; END IF;

  IF NOT public.is_agency_member(auth.uid(), v_agency_id) THEN
    RAISE EXCEPTION 'Acesso negado para modificar este grupo.';
  END IF;

  UPDATE public.group_tours 
  SET 
    pricing_tiers = p_pricing_tiers,
    extra_options = p_extra_options,
    updated_at = now()
  WHERE id = p_tour_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_group_tour_pricing(uuid, jsonb, jsonb) TO authenticated;

-- 3. RPC Segura para atualização de Budgets
CREATE OR REPLACE FUNCTION public.update_group_tour_budget(
  p_tour_id uuid,
  p_ads_budget numeric,
  p_target_poupanca_balance numeric
)
RETURNS void AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  SELECT agency_id INTO v_agency_id FROM public.group_tours WHERE id = p_tour_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Grupo não encontrado.'; END IF;

  IF NOT public.is_agency_member(auth.uid(), v_agency_id) THEN
    RAISE EXCEPTION 'Acesso negado para modificar este grupo.';
  END IF;

  UPDATE public.group_tours 
  SET 
    ads_budget = p_ads_budget,
    target_poupanca_balance = p_target_poupanca_balance,
    updated_at = now()
  WHERE id = p_tour_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_group_tour_budget(uuid, numeric, numeric) TO authenticated;
