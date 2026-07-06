-- Turis — SaaS Plan Enforcement & Strict Audit
-- Migration: 20260609000012_plans_enforcement

-- =========================================================================
-- 1. ESTRUTURA DE ASSINATURAS (SAAS SUBSCRIPTIONS)
-- =========================================================================
-- Conecta as agências aos Planos e aplica o status da assinatura.

CREATE TABLE IF NOT EXISTS public.agency_subscriptions (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agency_subscriptions TO authenticated;
GRANT ALL ON public.agency_subscriptions TO service_role;
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;

-- Leitura: Membros da agência ou Super Admin
CREATE POLICY "agency_subscriptions_read" ON public.agency_subscriptions FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id) OR public.has_role(auth.uid(), 'super_admin'));

-- Escrita: APENAS Super Admin (Backend services via service_role bypassing RLS tbm podem)
CREATE POLICY "agency_subscriptions_write" ON public.agency_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_agency_subs_updated_at
  BEFORE UPDATE ON public.agency_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 2. ENFORCEMENT DE LIMITES GLOBAIS NO BACKEND
-- =========================================================================
-- Impede a adição de usuários se a agência excedeu o limite do plano 
-- ou se a assinatura não estiver ativa.

CREATE OR REPLACE FUNCTION public.check_agency_limits(_agency_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub_status text;
  _plan_max_agents int;
  _current_agents int;
BEGIN
  -- 1. Busca o status da assinatura e os limites do plano
  SELECT s.status, p.max_agents INTO _sub_status, _plan_max_agents
  FROM public.agency_subscriptions s
  LEFT JOIN public.plans p ON s.plan_id = p.id
  WHERE s.agency_id = _agency_id;

  -- Se não achar assinatura (agência nova sem bootstrap), consideramos bloqueado
  IF _sub_status IS NULL THEN
    RAISE EXCEPTION 'Agência sem assinatura ativa. Contate o suporte.';
  END IF;

  -- 2. Valida status (trial ou active)
  IF _sub_status NOT IN ('active', 'trialing') THEN
    RAISE EXCEPTION 'A assinatura desta agência está com status: %. Ação bloqueada.', _sub_status;
  END IF;

  -- 3. Valida limite de agentes
  IF _plan_max_agents IS NOT NULL THEN
    SELECT COUNT(*) INTO _current_agents 
    FROM public.user_roles 
    WHERE agency_id = _agency_id AND role IN ('agency_admin', 'agent');
    
    -- O limite é verificado antes da inserção, então não pode ser >= max_agents
    IF _current_agents >= _plan_max_agents THEN
      RAISE EXCEPTION 'Limite de assentos atingido para o plano atual (Máximo: %).', _plan_max_agents;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Aplica a trava (trigger) na tabela de user_roles para interceptar a criação de agentes
CREATE OR REPLACE FUNCTION public.trg_enforce_agency_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ignorar Super Admins
  IF NEW.role = 'super_admin' THEN RETURN NEW; END IF;
  
  -- Se for agência, valida os limites ANTES de inserir
  IF NEW.agency_id IS NOT NULL AND NEW.role IN ('agency_admin', 'agent') THEN
    PERFORM public.check_agency_limits(NEW.agency_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_agency_limits_before_insert ON public.user_roles;
CREATE TRIGGER enforce_agency_limits_before_insert
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_agency_limits();

-- =========================================================================
-- 3. AUTO-BOOTSTRAP DE ASSINATURA NA CRIAÇÃO DE AGÊNCIA
-- =========================================================================
-- Quando o Super Admin (ou self-service) cria uma agência, provisiona um Trial

CREATE OR REPLACE FUNCTION public.handle_agency_subscription_bootstrap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _free_plan_id uuid;
BEGIN
  -- Tenta achar um plano "Essencial" ou "Free" (Pega o menor sort_order)
  SELECT id INTO _free_plan_id FROM public.plans WHERE is_active = true ORDER BY sort_order ASC LIMIT 1;
  
  INSERT INTO public.agency_subscriptions (agency_id, plan_id, status, trial_ends_at)
  VALUES (NEW.id, _free_plan_id, 'trialing', now() + interval '14 days')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agency_bootstrap_subscription_trg ON public.agencies;
CREATE TRIGGER agency_bootstrap_subscription_trg
  AFTER INSERT ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.handle_agency_subscription_bootstrap();


-- =========================================================================
-- 4. ATUALIZAÇÃO DA RPC DO ADMIN (LOGS RIGOROSOS)
-- =========================================================================
-- Gravando no audit_log quando o Super Admin usar a RPC de criação de agência.

CREATE OR REPLACE FUNCTION public.admin_create_agency_and_invite(
  _name text,
  _slug text,
  _owner_email text,
  _cnpj text DEFAULT NULL,
  _phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_id uuid;
  _invite_token text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas Super Admins podem provisionar agências diretamente.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.agencies WHERE slug = _slug) THEN
    RAISE EXCEPTION 'O slug "%" já está em uso por outra agência.', _slug;
  END IF;

  INSERT INTO public.agencies (name, slug, created_by)
  VALUES (_name, _slug, NULL)
  RETURNING id INTO _agency_id;

  INSERT INTO public.agency_private (agency_id, email, document, phone)
  VALUES (_agency_id, _owner_email, _cnpj, _phone);

  _invite_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.agency_invites (agency_id, email, role, token, expires_at)
  VALUES (_agency_id, _owner_email, 'agency_admin', _invite_token, now() + interval '7 days');

  -- LOG RIGOROSO NA AUDITORIA
  PERFORM public.log_audit_event(
    _agency_id,
    'agency',
    _agency_id,
    'created_by_admin',
    jsonb_build_object('name', _name, 'slug', _slug, 'owner_email', _owner_email)
  );

  RETURN json_build_object(
    'agency_id', _agency_id,
    'invite_token', _invite_token
  );
END;
$$;
