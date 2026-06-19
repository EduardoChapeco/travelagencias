-- Migration: Flight Itineraries and Segments
-- Tabela para gerenciar o versionamento de itinerários de voos e seus segmentos.

CREATE TABLE IF NOT EXISTS public.flight_itineraries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  agency_id           uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  version             int NOT NULL DEFAULT 1,
  type                text NOT NULL DEFAULT 'original'
                        CHECK (type IN ('original', 'operator_suggestion', 'customer_selected', 'confirmed')),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'archived')),
  source              text NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual', 'ocr', 'import')),
  source_document_id  uuid,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flight_segments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id      uuid NOT NULL REFERENCES public.flight_itineraries(id) ON DELETE CASCADE,
  segment_order     int NOT NULL DEFAULT 1,
  airline_code      text NOT NULL,
  flight_number     text NOT NULL,
  origin_iata       text NOT NULL,
  destination_iata  text NOT NULL,
  departure_at      timestamptz NOT NULL,
  arrival_at        timestamptz NOT NULL,
  cabin             text,
  baggage           text,
  record_locator    text,
  airport_terminal  text,
  status            text NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled', 'delayed', 'cancelled', 'completed', 'active')),
  raw_source        jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS flight_itineraries_trip_idx ON public.flight_itineraries(trip_id);
CREATE INDEX IF NOT EXISTS flight_itineraries_agency_idx ON public.flight_itineraries(agency_id);
CREATE INDEX IF NOT EXISTS flight_segments_itinerary_idx ON public.flight_segments(itinerary_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.set_flight_rec_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_flight_itineraries_updated_at
  BEFORE UPDATE ON public.flight_itineraries
  FOR EACH ROW EXECUTE FUNCTION public.set_flight_rec_updated_at();

CREATE TRIGGER trg_flight_segments_updated_at
  BEFORE UPDATE ON public.flight_segments
  FOR EACH ROW EXECUTE FUNCTION public.set_flight_rec_updated_at();

-- Enable RLS
ALTER TABLE public.flight_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_segments ENABLE ROW LEVEL SECURITY;

-- flight_itineraries RLS Policies
CREATE POLICY "Agency members can view flight itineraries"
  ON public.flight_itineraries FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Agency members can insert flight itineraries"
  ON public.flight_itineraries FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Agency members can update flight itineraries"
  ON public.flight_itineraries FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Agency members can delete flight itineraries"
  ON public.flight_itineraries FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- flight_segments RLS Policies
CREATE POLICY "Agency members can view flight segments"
  ON public.flight_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flight_itineraries i
      WHERE i.id = flight_segments.itinerary_id
        AND i.agency_id IN (
          SELECT agency_id FROM public.agency_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

CREATE POLICY "Agency members can insert flight segments"
  ON public.flight_segments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flight_itineraries i
      WHERE i.id = flight_segments.itinerary_id
        AND i.agency_id IN (
          SELECT agency_id FROM public.agency_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

CREATE POLICY "Agency members can update flight segments"
  ON public.flight_segments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.flight_itineraries i
      WHERE i.id = flight_segments.itinerary_id
        AND i.agency_id IN (
          SELECT agency_id FROM public.agency_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

CREATE POLICY "Agency members can delete flight segments"
  ON public.flight_segments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.flight_itineraries i
      WHERE i.id = flight_segments.itinerary_id
        AND i.agency_id IN (
          SELECT agency_id FROM public.agency_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_itineraries TO authenticated;
GRANT ALL ON public.flight_itineraries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_segments TO authenticated;
GRANT ALL ON public.flight_segments TO service_role;
