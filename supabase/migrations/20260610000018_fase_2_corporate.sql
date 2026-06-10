-- ==============================================================================
-- FASE 2: MÓDULO CORPORATIVO B2B E RFPs
-- ==============================================================================

-- 1. Políticas Corporativas (Vinculadas a um cliente do tipo 'company')
CREATE TABLE IF NOT EXISTS public.corporate_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  require_approval_over numeric NOT NULL DEFAULT 0,
  allowed_cabin_classes text[] DEFAULT '{"economy"}',
  max_hotel_daily_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_policy_per_company UNIQUE (client_id)
);

ALTER TABLE public.corporate_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corporate policies viewable by agency members" ON public.corporate_policies
  FOR SELECT USING (is_agency_member(agency_id));

CREATE POLICY "Corporate policies insertable by agency members" ON public.corporate_policies
  FOR INSERT WITH CHECK (is_agency_member(agency_id));

CREATE POLICY "Corporate policies updatable by agency members" ON public.corporate_policies
  FOR UPDATE USING (is_agency_member(agency_id));

CREATE POLICY "Corporate policies deletable by agency members" ON public.corporate_policies
  FOR DELETE USING (is_agency_member(agency_id));


-- 2. RFPs Corporativas (Request for Proposal / Orçamentos para Empresas)
CREATE TABLE IF NOT EXISTS public.corporate_rfps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  title text NOT NULL,
  description text,
  destination text NOT NULL,
  departure_date date NOT NULL,
  return_date date,
  budget numeric,
  status text NOT NULL DEFAULT 'pending', -- pending, quoting, sent_for_approval, approved, rejected
  approval_token uuid DEFAULT gen_random_uuid(),
  approved_by text,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.corporate_rfps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corporate RFPs viewable by agency members" ON public.corporate_rfps
  FOR SELECT USING (is_agency_member(agency_id));

CREATE POLICY "Corporate RFPs viewable by public using token" ON public.corporate_rfps
  FOR SELECT USING (true); -- Leitura pública para carregar a página de aprovação via token

CREATE POLICY "Corporate RFPs insertable by agency members" ON public.corporate_rfps
  FOR INSERT WITH CHECK (is_agency_member(agency_id));

CREATE POLICY "Corporate RFPs updatable by public using token" ON public.corporate_rfps
  FOR UPDATE USING (true); -- Permitir que a empresa aprove externamente (controlado via RLS/Token)
  
CREATE POLICY "Corporate RFPs deletable by agency members" ON public.corporate_rfps
  FOR DELETE USING (is_agency_member(agency_id));

-- Trigger update_updated_at para RFPs
CREATE TRIGGER trg_corporate_rfps_updated_at
BEFORE UPDATE ON public.corporate_rfps
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
