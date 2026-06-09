
-- bus_layouts table
CREATE TABLE IF NOT EXISTS public.bus_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'bus',
  rows INTEGER NOT NULL DEFAULT 10,
  cols INTEGER NOT NULL DEFAULT 4,
  seat_map JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bus_layouts TO authenticated;
GRANT ALL ON public.bus_layouts TO service_role;
ALTER TABLE public.bus_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bl read" ON public.bus_layouts FOR SELECT TO authenticated USING (is_agency_member(auth.uid(), agency_id));
CREATE POLICY "bl insert" ON public.bus_layouts FOR INSERT TO authenticated WITH CHECK (is_agency_member(auth.uid(), agency_id));
CREATE POLICY "bl update" ON public.bus_layouts FOR UPDATE TO authenticated USING (is_agency_member(auth.uid(), agency_id));
CREATE POLICY "bl delete" ON public.bus_layouts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'agency_admin'::app_role, agency_id));

-- position on boarding_cards
ALTER TABLE public.boarding_cards ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
