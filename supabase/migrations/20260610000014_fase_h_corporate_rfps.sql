-- Fase H.3: Corporate RFPs (Request for Proposal)

CREATE TABLE IF NOT EXISTS public.corporate_rfps (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  corporate_client_id uuid references public.corporate_clients(id),
  company_name text not null,
  passenger_name text,
  destination text not null,
  travel_dates text,
  passengers_count int default 1,
  budget numeric,
  requirements text,
  status text not null default 'pending' check (status in ('pending', 'quoted', 'approved', 'rejected', 'converted')),
  trip_id uuid references public.trips(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.corporate_rfps TO authenticated;
GRANT ALL ON public.corporate_rfps TO service_role;

ALTER TABLE public.corporate_rfps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crfp read" ON public.corporate_rfps FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "crfp insert" ON public.corporate_rfps FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "crfp update" ON public.corporate_rfps FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "crfp delete" ON public.corporate_rfps FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'agency_admin', agency_id));

CREATE TRIGGER crfp_touch BEFORE UPDATE ON public.corporate_rfps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
