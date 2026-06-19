-- Migration: Trip Confirmation Items
-- Tabela normalizada para armazenar localizadores e confirmações de serviços por viagem.
-- Substitui qualquer dado hardcoded / in-memory no frontend.

CREATE TABLE IF NOT EXISTS public.trip_confirmation_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  agency_id      uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  item_type      text NOT NULL DEFAULT 'other'
                   CHECK (item_type IN ('flight', 'hotel', 'transfer', 'insurance', 'cruise', 'tour', 'other')),
  provider_name  text NOT NULL,
  details        text,
  service_date   date,
  locator_code   text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes          text,
  sort_order     int NOT NULL DEFAULT 0,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS trip_conf_items_trip_idx     ON public.trip_confirmation_items(trip_id);
CREATE INDEX IF NOT EXISTS trip_conf_items_agency_idx   ON public.trip_confirmation_items(agency_id);
CREATE INDEX IF NOT EXISTS trip_conf_items_status_idx   ON public.trip_confirmation_items(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_trip_conf_items_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trip_conf_items_updated_at
  BEFORE UPDATE ON public.trip_confirmation_items
  FOR EACH ROW EXECUTE FUNCTION public.set_trip_conf_items_updated_at();

-- RLS
ALTER TABLE public.trip_confirmation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view their trip confirmation items"
  ON public.trip_confirmation_items FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Agency members can insert trip confirmation items"
  ON public.trip_confirmation_items FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Agency members can update their trip confirmation items"
  ON public.trip_confirmation_items FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Agency members can delete their trip confirmation items"
  ON public.trip_confirmation_items FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
