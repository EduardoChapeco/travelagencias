
-- ============ plans ============
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_annual numeric NOT NULL DEFAULT 0,
  max_agents int,
  max_clients int,
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_public_read ON public.plans;
CREATE POLICY plans_public_read ON public.plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS plans_super_admin_write ON public.plans;
CREATE POLICY plans_super_admin_write ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
DROP TRIGGER IF EXISTS plans_set_updated_at ON public.plans;
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ push_subscriptions ============
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid,
  endpoint text NOT NULL,
  keys jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ps_own ON public.push_subscriptions;
CREATE POLICY ps_own ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS ps_insert_own ON public.push_subscriptions;
CREATE POLICY ps_insert_own ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS ps_delete_own ON public.push_subscriptions;
CREATE POLICY ps_delete_own ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ global_settings ============
CREATE TABLE IF NOT EXISTS public.global_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.global_settings TO anon, authenticated;
GRANT ALL ON public.global_settings TO service_role;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gs_public_read ON public.global_settings;
CREATE POLICY gs_public_read ON public.global_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS gs_super_admin_write ON public.global_settings;
CREATE POLICY gs_super_admin_write ON public.global_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ============ ai_chat_messages ============
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  tokens_in int,
  tokens_out int,
  provider text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_chat_messages_conv_idx ON public.ai_chat_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS ai_chat_messages_agency_idx ON public.ai_chat_messages (agency_id, created_at DESC);
GRANT SELECT, INSERT ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS acm_read ON public.ai_chat_messages;
CREATE POLICY acm_read ON public.ai_chat_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_agency_member(auth.uid(), agency_id));
DROP POLICY IF EXISTS acm_insert ON public.ai_chat_messages;
CREATE POLICY acm_insert ON public.ai_chat_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_agency_member(auth.uid(), agency_id));

-- ============ ai_rate_limit ============
CREATE TABLE IF NOT EXISTS public.ai_rate_limit (
  agency_id uuid NOT NULL,
  bucket_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (agency_id, bucket_start)
);
GRANT SELECT, INSERT, UPDATE ON public.ai_rate_limit TO authenticated;
GRANT ALL ON public.ai_rate_limit TO service_role;
ALTER TABLE public.ai_rate_limit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS arl_read ON public.ai_rate_limit;
CREATE POLICY arl_read ON public.ai_rate_limit FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
DROP POLICY IF EXISTS arl_write ON public.ai_rate_limit;
CREATE POLICY arl_write ON public.ai_rate_limit FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
DROP POLICY IF EXISTS arl_update ON public.ai_rate_limit;
CREATE POLICY arl_update ON public.ai_rate_limit FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- ============ policy_documents ============
CREATE TABLE IF NOT EXISTS public.policy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('terms','privacy','cookies','lgpd','dpa')),
  version text NOT NULL,
  content_md text NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, version)
);
GRANT SELECT ON public.policy_documents TO anon, authenticated;
GRANT ALL ON public.policy_documents TO service_role;
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pd_public_read ON public.policy_documents;
CREATE POLICY pd_public_read ON public.policy_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS pd_super_admin_write ON public.policy_documents;
CREATE POLICY pd_super_admin_write ON public.policy_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ============ contracts immutability trigger ============
DROP TRIGGER IF EXISTS contracts_immutable_after_signed_trg ON public.contracts;
CREATE TRIGGER contracts_immutable_after_signed_trg
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.contracts_immutable_after_signed();

-- ============ R02: trip → boarding_card ============
CREATE OR REPLACE FUNCTION public.trip_created_make_boarding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.boarding_cards (trip_id, agency_id, status, checklist, alerts)
  VALUES (NEW.id, NEW.agency_id, 'pending', '[]'::jsonb, '{}')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.trip_created_make_boarding() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trip_created_boarding_trg ON public.trips;
CREATE TRIGGER trip_created_boarding_trg
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trip_created_make_boarding();

-- ============ pick_active_api_key (orquestrador) ============
CREATE OR REPLACE FUNCTION public.pick_active_api_key(_provider text, _agency_id uuid)
RETURNS TABLE(id uuid, key_value text, scope text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  (
    SELECT k.id, k.key_value, 'agency'::text AS scope
    FROM public.api_keys k
    WHERE k.provider = _provider
      AND k.agency_id = _agency_id
      AND k.is_active = true
      AND (k.monthly_limit IS NULL OR k.used_count < k.monthly_limit)
    ORDER BY k.used_count ASC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT k.id, k.key_value, 'global'::text
    FROM public.api_keys k
    WHERE k.provider = _provider
      AND k.agency_id IS NULL
      AND k.is_active = true
      AND (k.monthly_limit IS NULL OR k.used_count < k.monthly_limit)
    ORDER BY k.used_count ASC
    LIMIT 1
  )
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.pick_active_api_key(text, uuid) FROM PUBLIC, anon, authenticated;

-- ============ Super admin override for api_keys ============
DROP POLICY IF EXISTS ak_super_admin_all ON public.api_keys;
CREATE POLICY ak_super_admin_all ON public.api_keys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
