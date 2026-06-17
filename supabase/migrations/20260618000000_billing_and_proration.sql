-- TravelOS — SaaS Billing, Invoices & Proration Engine
-- Migration: 20260618000000_billing_and_proration

-- =========================================================================
-- 1. TABELA DE FATURAS E COBRANÇA (AGENCY BILLING INVOICES)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.agency_billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  status text NOT NULL CHECK (status IN ('paid', 'past_due', 'pending', 'canceled')),
  due_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  billing_period_start timestamptz,
  billing_period_end timestamptz
);

-- RLS & Permissões
GRANT SELECT ON public.agency_billing_invoices TO authenticated;
GRANT ALL ON public.agency_billing_invoices TO service_role;
ALTER TABLE public.agency_billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_invoices_read" ON public.agency_billing_invoices FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_invoices_write" ON public.agency_billing_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================================
-- 2. ENGENHARIA DE PRÓ-RATA (PRORATION MATH RPCs)
-- =========================================================================

-- Função para calcular crédito de pró-rata
CREATE OR REPLACE FUNCTION public.calculate_proration_credit(
  _agency_id uuid,
  _new_plan_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub_status text;
  _current_plan_price numeric;
  _new_plan_price numeric;
  _period_start timestamptz;
  _period_end timestamptz;
  
  _total_days double precision;
  _remaining_days double precision;
  _credit_ratio double precision;
  _credit_amount numeric;
  _final_amount numeric;
BEGIN
  -- 1. Busca os dados da assinatura atual
  SELECT s.status, s.current_period_end, s.updated_at, p.price_monthly
  INTO _sub_status, _period_end, _period_start, _current_plan_price
  FROM public.agency_subscriptions s
  LEFT JOIN public.plans p ON s.plan_id = p.id
  WHERE s.agency_id = _agency_id;

  -- Se não existir assinatura ativa
  IF _sub_status IS NULL THEN
    _current_plan_price := 0;
    _period_start := now();
    _period_end := now() + interval '30 days';
  END IF;

  -- 2. Busca o preço do novo plano
  SELECT price_monthly INTO _new_plan_price FROM public.plans WHERE id = _new_plan_id;
  IF _new_plan_price IS NULL THEN
    RAISE EXCEPTION 'Plano selecionado não existe ou está inativo.';
  END IF;

  -- 3. Caso padrão (Se o plano atual for grátis ou não tiver assinatura válida)
  IF _current_plan_price <= 0 OR _period_end IS NULL OR _period_end <= now() THEN
    RETURN jsonb_build_object(
      'current_plan_price', 0,
      'new_plan_price', _new_plan_price,
      'remaining_days', 0,
      'credit_amount', 0,
      'final_amount_due', _new_plan_price
    );
  END IF;

  -- 4. Cálculo matemático da pró-rata
  -- Se o period_start for posterior a agora (muda de plano muito rápido), ajustamos
  IF _period_start >= now() THEN
    _period_start := now() - interval '1 second';
  END IF;
  
  _total_days := EXTRACT(EPOCH FROM (_period_end - _period_start)) / 86400.0;
  _remaining_days := EXTRACT(EPOCH FROM (_period_end - now())) / 86400.0;
  
  IF _remaining_days < 0 THEN _remaining_days := 0; END IF;
  IF _total_days <= 0 THEN _total_days := 30.0; END IF;

  _credit_ratio := _remaining_days / _total_days;
  _credit_amount := round((_current_plan_price * _credit_ratio)::numeric, 2);
  
  -- Garante que o crédito não ultrapasse o valor pago nem o valor do novo plano
  IF _credit_amount > _current_plan_price THEN
    _credit_amount := _current_plan_price;
  END IF;
  
  _final_amount := _new_plan_price - _credit_amount;
  IF _final_amount < 0 THEN
    _final_amount := 0; -- O excedente vira saldo, mas não devolvemos dinheiro (crédito expira na mudança)
  END IF;

  RETURN jsonb_build_object(
    'current_plan_price', _current_plan_price,
    'new_plan_price', _new_plan_price,
    'remaining_days', round(_remaining_days::numeric, 1),
    'credit_amount', _credit_amount,
    'final_amount_due', _final_amount
  );
END;
$$;

-- Função transacional para Upgrade de Plano
CREATE OR REPLACE FUNCTION public.upgrade_agency_plan(
  _agency_id uuid,
  _new_plan_id uuid,
  _is_annual boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proration jsonb;
  _final_amount numeric;
  _invoice_id uuid;
BEGIN
  -- 1. Verifica se o usuário tem permissão na agência
  IF NOT (public.is_agency_member(auth.uid(), _agency_id) OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Acesso negado: Você não é membro gestor desta agência.';
  END IF;

  -- 2. Calcula os valores da pró-rata
  _proration := public.calculate_proration_credit(_agency_id, _new_plan_id);
  _final_amount := (_proration->>'final_amount_due')::numeric;

  -- 3. Insere a fatura paga na tabela de cobranças
  INSERT INTO public.agency_billing_invoices (
    agency_id, amount, status, due_date, paid_at, billing_period_start, billing_period_end
  ) VALUES (
    _agency_id,
    _final_amount,
    'paid',
    now(),
    now(),
    now(),
    now() + interval '30 days'
  ) RETURNING id INTO _invoice_id;

  -- 4. Atualiza a assinatura da agência para o novo plano e renova datas
  INSERT INTO public.agency_subscriptions (
    agency_id, plan_id, status, current_period_end, cancel_at_period_end, updated_at
  ) VALUES (
    _agency_id,
    _new_plan_id,
    'active',
    now() + interval '30 days',
    false,
    now()
  )
  ON CONFLICT (agency_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = now();

  -- 5. Grava evento no log de auditoria
  PERFORM public.log_audit_event(
    _agency_id,
    'agency_subscription',
    _new_plan_id,
    'upgraded_plan',
    jsonb_build_object('invoice_id', _invoice_id, 'amount_paid', _final_amount, 'plan_id', _new_plan_id)
  );

  RETURN json_build_object(
    'success', true,
    'invoice_id', _invoice_id,
    'amount_paid', _final_amount
  );
END;
$$;

-- =========================================================================
-- 3. ENFORCEMENT DE LIMITES ADICIONAIS (VIAGENS)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.check_agency_trip_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _sub_status text;
  _max_trips int;
  _current_trips int;
BEGIN
  -- Busca os limites da agência
  SELECT s.status, p.max_trips_per_month INTO _sub_status, _max_trips
  FROM public.agency_subscriptions s
  LEFT JOIN public.plans p ON s.plan_id = p.id
  WHERE s.agency_id = NEW.agency_id;

  -- Valida se a assinatura está ativa
  IF _sub_status IS NULL OR _sub_status NOT IN ('active', 'trialing') THEN
    RAISE EXCEPTION 'Acesso Bloqueado: Assinatura inativa ou pendente de faturamento.';
  END IF;

  -- Se o plano tiver limite de viagens (exclui -1 que indica ilimitado)
  IF _max_trips IS NOT NULL AND _max_trips <> -1 THEN
    SELECT COUNT(*) INTO _current_trips
    FROM public.trips
    WHERE agency_id = NEW.agency_id 
      AND created_at >= date_trunc('month', now())
      AND deleted_at IS NULL;

    IF _current_trips >= _max_trips THEN
      RAISE EXCEPTION 'Limite de Viagens/Mês atingido para o plano atual (Máximo: % viagens). Faça um Upgrade para liberar viagens ilimitadas.', _max_trips;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_trip_limits_before_insert ON public.trips;
CREATE TRIGGER enforce_trip_limits_before_insert
  BEFORE INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.check_agency_trip_limit();
