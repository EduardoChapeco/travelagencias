-- Migration: 20260726000000_vibetour_quote_tables.sql
-- Description: Tabelas Core do VibeTour/Quote Intelligence, RLS e Policies

-- 1. quote_requests
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual', -- form | chat | crm | public_vibetour | manual
  status text NOT NULL DEFAULT 'draft', -- draft | ready_to_plan | planning | searching | completed | cancelled | converted
  raw_request text,
  normalized_intent jsonb,
  assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_requests_all ON public.quote_requests
  FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- 2. quote_travelers
CREATE TABLE IF NOT EXISTS public.quote_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  traveler_type text NOT NULL DEFAULT 'adult', -- adult | child | infant | senior
  age int,
  attributes jsonb DEFAULT '{}'::jsonb,
  client_traveler_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_travelers ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_travelers_all ON public.quote_travelers
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests r
      WHERE r.id = quote_request_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 3. quote_preferences
CREATE TABLE IF NOT EXISTS public.quote_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  preference_value text NOT NULL,
  priority int NOT NULL DEFAULT 0,
  hard_constraint boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual',
  confidence numeric(3,2) DEFAULT 1.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_preferences_all ON public.quote_preferences
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests r
      WHERE r.id = quote_request_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 4. quote_search_plans
CREATE TABLE IF NOT EXISTS public.quote_search_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | executed
  limits jsonb DEFAULT '{}'::jsonb,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_search_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_search_plans_all ON public.quote_search_plans
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests r
      WHERE r.id = quote_request_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 5. quote_scenarios
CREATE TABLE IF NOT EXISTS public.quote_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_plan_id uuid NOT NULL REFERENCES public.quote_search_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  scenario_type text NOT NULL, -- exact_dates | flexible_dates | gateway_overnight | flight_direct | upgrade_hotel
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  priority int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_scenarios_all ON public.quote_scenarios
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quote_search_plans p
      JOIN public.quote_requests r ON r.id = p.quote_request_id
      WHERE p.id = search_plan_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 6. normalized_offers
CREATE TABLE IF NOT EXISTS public.normalized_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.quote_scenarios(id) ON DELETE CASCADE,
  provider text NOT NULL, -- infotravel | manual | local
  external_offer_id text,
  product_type text NOT NULL, -- hotel | flight | transfer | package | activity
  normalized_data jsonb NOT NULL,
  price_total numeric(12,2) NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'BRL',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'available' -- available | on_request | sold_out | expired
);

ALTER TABLE public.normalized_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY normalized_offers_all ON public.normalized_offers
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests r
      WHERE r.id = quote_request_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 7. package_candidates
CREATE TABLE IF NOT EXISTS public.package_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft | valid | invalid | shortlisted | approved | selected
  composition_version int NOT NULL DEFAULT 1,
  total_price numeric(12,2) NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'BRL',
  score int NOT NULL DEFAULT 0,
  score_profile_id uuid, -- link opcional a um profile
  warnings jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.package_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY package_candidates_all ON public.package_candidates
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests r
      WHERE r.id = quote_request_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 8. package_candidate_components
CREATE TABLE IF NOT EXISTS public.package_candidate_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_candidate_id uuid NOT NULL REFERENCES public.package_candidates(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.normalized_offers(id) ON DELETE CASCADE,
  component_type text NOT NULL, -- flight | accommodation | transfer | experience | insurance
  sort_order int NOT NULL DEFAULT 0,
  price_allocation numeric(12,2) NOT NULL DEFAULT 0.00,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.package_candidate_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY package_components_all ON public.package_candidate_components
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.package_candidates c
      JOIN public.quote_requests r ON r.id = c.quote_request_id
      WHERE c.id = package_candidate_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 9. package_scorecards
CREATE TABLE IF NOT EXISTS public.package_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_candidate_id uuid NOT NULL REFERENCES public.package_candidates(id) ON DELETE CASCADE,
  rule_version_set text NOT NULL,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb, -- flight_score, hotel_score, logistics_score, experience_score
  penalties jsonb NOT NULL DEFAULT '[]'::jsonb,
  bonuses jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_score int NOT NULL DEFAULT 0,
  explanation text,
  confidence numeric(3,2) DEFAULT 1.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.package_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY package_scorecards_all ON public.package_scorecards
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.package_candidates c
      JOIN public.quote_requests r ON r.id = c.quote_request_id
      WHERE c.id = package_candidate_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 10. score_profiles
CREATE TABLE IF NOT EXISTS public.score_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- null para default global
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'agency', -- global | agency
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.score_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_profiles_all ON public.score_profiles
  FOR ALL TO authenticated USING (
    scope = 'global' OR public.is_agency_member(auth.uid(), agency_id)
  );

-- 11. decision_rules
CREATE TABLE IF NOT EXISTS public.decision_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- null para default global
  code text NOT NULL UNIQUE,
  scope text NOT NULL DEFAULT 'agency', -- global | agency
  status text NOT NULL DEFAULT 'active',
  current_version_id uuid, -- sera atualizado via trigger ou manualmente
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_rules_all ON public.decision_rules
  FOR ALL TO authenticated USING (
    scope = 'global' OR public.is_agency_member(auth.uid(), agency_id)
  );

-- 12. decision_rule_versions
CREATE TABLE IF NOT EXISTS public.decision_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.decision_rules(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  expression jsonb NOT NULL,
  effect jsonb NOT NULL,
  source text NOT NULL DEFAULT 'manual', -- manual | learned
  confidence numeric(3,2) DEFAULT 1.00,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_rule_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rule_versions_all ON public.decision_rule_versions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.decision_rules r
      WHERE r.id = rule_id AND (r.scope = 'global' OR public.is_agency_member(auth.uid(), r.agency_id))
    )
  );

-- 13. decision_records
CREATE TABLE IF NOT EXISTS public.decision_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  selected_package_id uuid REFERENCES public.package_candidates(id) ON DELETE SET NULL,
  sent_packages jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected_packages jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_source text NOT NULL DEFAULT 'agent', -- agent | client
  reason text,
  outcome text NOT NULL DEFAULT 'pending', -- pending | accepted | rejected
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_records_all ON public.decision_records
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests r
      WHERE r.id = quote_request_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 14. rule_candidates
CREATE TABLE IF NOT EXISTS public.rule_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  proposed_rule jsonb NOT NULL,
  sample_size int NOT NULL DEFAULT 0,
  confidence numeric(3,2) NOT NULL DEFAULT 0.00,
  simulated_impact jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | ignored | rejected
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rule_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY rule_candidates_all ON public.rule_candidates
  FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- 15. simulation_runs
CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  personas text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued', -- queued | running | completed | failed
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulation_runs_all ON public.simulation_runs
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests r
      WHERE r.id = quote_request_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 16. simulation_results
CREATE TABLE IF NOT EXISTS public.simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_run_id uuid NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  package_candidate_id uuid NOT NULL REFERENCES public.package_candidates(id) ON DELETE CASCADE,
  persona text NOT NULL,
  score int NOT NULL DEFAULT 0,
  objections text[] NOT NULL DEFAULT '{}',
  strengths text[] NOT NULL DEFAULT '{}',
  confidence numeric(3,2) DEFAULT 1.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulation_results_all ON public.simulation_results
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.simulation_runs s
      JOIN public.quote_requests r ON r.id = s.quote_request_id
      WHERE s.id = simulation_run_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 17. quote_snapshots
CREATE TABLE IF NOT EXISTS public.quote_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL, -- proposal_create | booking_request | client_view
  data jsonb NOT NULL,
  hash text NOT NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_snapshots_all ON public.quote_snapshots
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests r
      WHERE r.id = quote_request_id AND public.is_agency_member(auth.uid(), r.agency_id)
    )
  );

-- 18. promotion_watch_profiles
CREATE TABLE IF NOT EXISTS public.promotion_watch_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule text NOT NULL, -- cron expression
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active', -- active | paused
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_watch_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY watch_profiles_all ON public.promotion_watch_profiles
  FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- 19. promotion_candidates
CREATE TABLE IF NOT EXISTS public.promotion_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_profile_id uuid NOT NULL REFERENCES public.promotion_watch_profiles(id) ON DELETE CASCADE,
  package_candidate_id uuid NOT NULL REFERENCES public.package_candidates(id) ON DELETE CASCADE,
  detected_at timestamptz NOT NULL DEFAULT now(),
  score int NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending | reviewed | ignored | published
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY promotion_candidates_all ON public.promotion_candidates
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.promotion_watch_profiles w
      WHERE w.id = watch_profile_id AND public.is_agency_member(auth.uid(), w.agency_id)
    )
  );

-- 20. Triggers de set_updated_at para quote_requests
CREATE TRIGGER touch_quote_requests BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
