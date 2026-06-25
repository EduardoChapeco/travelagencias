-- Migration: 20260722000000_flight_reaccommodation_workflow.sql
-- Fases 5 & 6: Reacomodação Aérea, Aceite do Cliente e Comunicação com Operadora

-- Função para atualizar o timestamp updated_at
CREATE OR REPLACE FUNCTION public.set_flight_rec_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Casos de Alteração/Reacomodação Aérea
CREATE TABLE IF NOT EXISTS public.flight_change_cases (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  agency_id             uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  original_itinerary_id uuid REFERENCES public.flight_itineraries(id) ON DELETE SET NULL,
  change_reason         text, -- 'schedule_change', 'cancellation', 'baggage_policy_change', etc.
  detected_at           timestamptz NOT NULL DEFAULT now(),
  detected_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  workflow_status       text NOT NULL DEFAULT 'change_detected'
                          CHECK (workflow_status IN ('change_detected', 'alternatives_added', 'client_notified', 'client_accepted', 'client_rejected', 'operator_notified', 'resolved', 'cancelled')),
  priority              text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 2. Alternativas de Itinerário Aéreo
CREATE TABLE IF NOT EXISTS public.flight_alternatives (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_case_id      uuid NOT NULL REFERENCES public.flight_change_cases(id) ON DELETE CASCADE,
  itinerary_id        uuid NOT NULL REFERENCES public.flight_itineraries(id) ON DELETE CASCADE,
  source              text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'operator')),
  ranking             int NOT NULL DEFAULT 1,
  availability_status text NOT NULL DEFAULT 'unknown' CHECK (availability_status IN ('unknown', 'available', 'waitlist', 'sold_out')),
  customer_visible    boolean NOT NULL DEFAULT false,
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 3. Análise Determinística de Diferenças
CREATE TABLE IF NOT EXISTS public.flight_difference_analysis (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_itinerary_id       uuid NOT NULL REFERENCES public.flight_itineraries(id) ON DELETE CASCADE,
  alternative_itinerary_id    uuid NOT NULL REFERENCES public.flight_itineraries(id) ON DELETE CASCADE,
  date_changed                boolean NOT NULL DEFAULT false,
  time_changed                boolean NOT NULL DEFAULT false,
  airport_changed             boolean NOT NULL DEFAULT false,
  overnight_connection        boolean NOT NULL DEFAULT false,
  total_duration_delta_minutes int NOT NULL DEFAULT 0,
  layover_delta_minutes       int NOT NULL DEFAULT 0,
  segment_count_delta         int NOT NULL DEFAULT 0,
  baggage_changed             boolean NOT NULL DEFAULT false,
  cabin_changed               boolean NOT NULL DEFAULT false,
  risk_score                  int NOT NULL DEFAULT 0,
  warnings                    text[] DEFAULT '{}'::text[],
  ai_summary                  text,
  deterministic_summary       text,
  reviewed_by                 uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at                 timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- 4. Decisões do Cliente (Aceite Jurídico / Evidências)
CREATE TABLE IF NOT EXISTS public.customer_travel_decisions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  change_case_id        uuid NOT NULL REFERENCES public.flight_change_cases(id) ON DELETE CASCADE,
  selected_alternative_id uuid REFERENCES public.flight_alternatives(id) ON DELETE SET NULL,
  decision_status       text NOT NULL DEFAULT 'pending' CHECK (decision_status IN ('pending', 'accepted', 'rejected')),
  decision_text_snapshot text,
  disclosures_snapshot  text[] DEFAULT '{}'::text[],
  accepted_at           timestamptz,
  typed_name            text,
  otp_verified_at       timestamptz,
  ip_address            text,
  user_agent            text,
  signature_hash        text,
  portal_session_id     text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 5. Comunicações e Solicitações de Reacomodação com a Operadora
CREATE TABLE IF NOT EXISTS public.operator_reaccommodation_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  change_case_id        uuid NOT NULL REFERENCES public.flight_change_cases(id) ON DELETE CASCADE,
  customer_decision_id  uuid REFERENCES public.customer_travel_decisions(id) ON DELETE SET NULL,
  operator_id           uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'confirmed', 'rejected')),
  email_thread_id       text,
  requested_at          timestamptz NOT NULL DEFAULT now(),
  confirmed_at          timestamptz,
  response_snapshot     jsonb DEFAULT '{}'::jsonb,
  confirmed_itinerary_id uuid REFERENCES public.flight_itineraries(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as novas tabelas
ALTER TABLE public.flight_change_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_difference_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_travel_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_reaccommodation_requests ENABLE ROW LEVEL SECURITY;

-- Triggers de updated_at para integridade
DROP TRIGGER IF EXISTS trg_flight_change_cases_updated_at ON public.flight_change_cases;
CREATE TRIGGER trg_flight_change_cases_updated_at BEFORE UPDATE ON public.flight_change_cases FOR EACH ROW EXECUTE FUNCTION public.set_flight_rec_updated_at();

DROP TRIGGER IF EXISTS trg_flight_alternatives_updated_at ON public.flight_alternatives;
CREATE TRIGGER trg_flight_alternatives_updated_at BEFORE UPDATE ON public.flight_alternatives FOR EACH ROW EXECUTE FUNCTION public.set_flight_rec_updated_at();

DROP TRIGGER IF EXISTS trg_flight_difference_analysis_updated_at ON public.flight_difference_analysis;
CREATE TRIGGER trg_flight_difference_analysis_updated_at BEFORE UPDATE ON public.flight_difference_analysis FOR EACH ROW EXECUTE FUNCTION public.set_flight_rec_updated_at();

DROP TRIGGER IF EXISTS trg_customer_travel_decisions_updated_at ON public.customer_travel_decisions;
CREATE TRIGGER trg_customer_travel_decisions_updated_at BEFORE UPDATE ON public.customer_travel_decisions FOR EACH ROW EXECUTE FUNCTION public.set_flight_rec_updated_at();

DROP TRIGGER IF EXISTS trg_operator_reaccommodation_requests_updated_at ON public.operator_reaccommodation_requests;
CREATE TRIGGER trg_operator_reaccommodation_requests_updated_at BEFORE UPDATE ON public.operator_reaccommodation_requests FOR EACH ROW EXECUTE FUNCTION public.set_flight_rec_updated_at();

-- Políticas RLS genéricas para membros ativos da agência e clientes B2C

-- 1. flight_change_cases
DROP POLICY IF EXISTS "Membros da agência acessam reacomodações" ON public.flight_change_cases;
CREATE POLICY "Membros da agência acessam reacomodações" ON public.flight_change_cases FOR ALL USING (
  public.is_agency_member(auth.uid(), agency_id)
);
DROP POLICY IF EXISTS "Clientes visualizam suas reacomodações" ON public.flight_change_cases;
CREATE POLICY "Clientes visualizam suas reacomodações" ON public.flight_change_cases FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
);

-- 2. flight_alternatives
DROP POLICY IF EXISTS "Membros da agência acessam alternativas" ON public.flight_alternatives;
CREATE POLICY "Membros da agência acessam alternativas" ON public.flight_alternatives FOR ALL USING (
  EXISTS (SELECT 1 FROM public.flight_change_cases c WHERE c.id = flight_alternatives.change_case_id AND public.is_agency_member(auth.uid(), c.agency_id))
);
DROP POLICY IF EXISTS "Clientes visualizam alternativas visíveis" ON public.flight_alternatives;
CREATE POLICY "Clientes visualizam alternativas visíveis" ON public.flight_alternatives FOR SELECT USING (
  customer_visible = true AND EXISTS (SELECT 1 FROM public.flight_change_cases c WHERE c.id = flight_alternatives.change_case_id AND c.trip_id IN (SELECT id FROM public.trips WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())))
);

-- 3. flight_difference_analysis
DROP POLICY IF EXISTS "Membros da agência acessam análises de voo" ON public.flight_difference_analysis;
CREATE POLICY "Membros da agência acessam análises de voo" ON public.flight_difference_analysis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.flight_itineraries i WHERE i.id = flight_difference_analysis.original_itinerary_id AND public.is_agency_member(auth.uid(), i.agency_id))
);
DROP POLICY IF EXISTS "Clientes visualizam análises de voo de suas viagens" ON public.flight_difference_analysis;
CREATE POLICY "Clientes visualizam análises de voo de suas viagens" ON public.flight_difference_analysis FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.flight_itineraries i WHERE i.id = flight_difference_analysis.original_itinerary_id AND i.trip_id IN (SELECT id FROM public.trips WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())))
);

-- 4. customer_travel_decisions
DROP POLICY IF EXISTS "Membros da agência acessam decisões de clientes" ON public.customer_travel_decisions;
CREATE POLICY "Membros da agência acessam decisões de clientes" ON public.customer_travel_decisions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.flight_change_cases c WHERE c.id = customer_travel_decisions.change_case_id AND public.is_agency_member(auth.uid(), c.agency_id))
);
DROP POLICY IF EXISTS "Clientes visualizam suas próprias decisões" ON public.customer_travel_decisions;
CREATE POLICY "Clientes visualizam suas próprias decisões" ON public.customer_travel_decisions FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
);
DROP POLICY IF EXISTS "Clientes inserem suas próprias decisões" ON public.customer_travel_decisions;
CREATE POLICY "Clientes inserem suas próprias decisões" ON public.customer_travel_decisions FOR INSERT WITH CHECK (
  trip_id IN (SELECT id FROM public.trips WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
);
DROP POLICY IF EXISTS "Clientes atualizam suas próprias decisões" ON public.customer_travel_decisions;
CREATE POLICY "Clientes atualizam suas próprias decisões" ON public.customer_travel_decisions FOR UPDATE USING (
  trip_id IN (SELECT id FROM public.trips WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
);

-- 5. operator_reaccommodation_requests
DROP POLICY IF EXISTS "Membros da agência acessam solicitações de operadora" ON public.operator_reaccommodation_requests;
CREATE POLICY "Membros da agência acessam solicitações de operadora" ON public.operator_reaccommodation_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.flight_change_cases c WHERE c.id = operator_reaccommodation_requests.change_case_id AND public.is_agency_member(auth.uid(), c.agency_id))
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_change_cases TO authenticated;
GRANT ALL ON public.flight_change_cases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_alternatives TO authenticated;
GRANT ALL ON public.flight_alternatives TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_difference_analysis TO authenticated;
GRANT ALL ON public.flight_difference_analysis TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_travel_decisions TO authenticated;
GRANT ALL ON public.customer_travel_decisions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_reaccommodation_requests TO authenticated;
GRANT ALL ON public.operator_reaccommodation_requests TO service_role;
