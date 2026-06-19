-- ============================================================
-- Migration: 20260623000002_boarding_operational_upgrade.sql
-- Fase 2: Boarding Operacional — Enriquecer boarding_cards + boarding_tickets
-- ============================================================

-- 1. Enriquecer boarding_cards com dados operacionais do dia do embarque
ALTER TABLE public.boarding_cards
  ADD COLUMN IF NOT EXISTS departure_airport  text,
  ADD COLUMN IF NOT EXISTS arrival_airport    text,
  ADD COLUMN IF NOT EXISTS flight_number      text,
  ADD COLUMN IF NOT EXISTS airline            text,
  ADD COLUMN IF NOT EXISTS flight_date        timestamptz,
  ADD COLUMN IF NOT EXISTS flight_class       text, -- economy, business, first
  ADD COLUMN IF NOT EXISTS hotel_name         text,
  ADD COLUMN IF NOT EXISTS hotel_address      text,
  ADD COLUMN IF NOT EXISTS hotel_checkin      date,
  ADD COLUMN IF NOT EXISTS hotel_checkout     date,
  ADD COLUMN IF NOT EXISTS hotel_phone        text,
  ADD COLUMN IF NOT EXISTS transfer_provider  text,
  ADD COLUMN IF NOT EXISTS transfer_time      timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_vehicle   text,
  ADD COLUMN IF NOT EXISTS emergency_phone    text,
  ADD COLUMN IF NOT EXISTS guide_name         text,
  ADD COLUMN IF NOT EXISTS guide_phone        text,
  ADD COLUMN IF NOT EXISTS guide_whatsapp     text,
  ADD COLUMN IF NOT EXISTS notes_internal     text,
  ADD COLUMN IF NOT EXISTS destination        text,
  ADD COLUMN IF NOT EXISTS destination_type   text CHECK (destination_type IN ('national','international')) DEFAULT 'national',
  ADD COLUMN IF NOT EXISTS pax_count          int,
  ADD COLUMN IF NOT EXISTS documents_checklist jsonb NOT NULL DEFAULT '[]';

-- ============================================================
-- 2. Tabela de bilhetes / tickets por passageiro no embarque
-- ============================================================
CREATE TABLE IF NOT EXISTS public.boarding_tickets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        uuid NOT NULL REFERENCES public.boarding_cards(id) ON DELETE CASCADE,
  passenger_id   uuid REFERENCES public.trip_passengers(id) ON DELETE SET NULL,
  agency_id      uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('airline','show','attraction','park','transfer','cruise','other')),
  ticket_code    text,
  passenger_name text NOT NULL,
  date_time      timestamptz,
  venue          text,
  seat           text,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','issued','cancelled')),
  file_url       text,
  file_path      text,
  extracted_data jsonb NOT NULL DEFAULT '{}', -- dados extraídos por OCR
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS boarding_tickets_card_idx ON public.boarding_tickets(card_id);
CREATE INDEX IF NOT EXISTS boarding_tickets_agency_idx ON public.boarding_tickets(agency_id);
CREATE INDEX IF NOT EXISTS boarding_tickets_passenger_idx ON public.boarding_tickets(passenger_id);

ALTER TABLE public.boarding_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members select boarding_tickets" ON public.boarding_tickets;
CREATE POLICY "agency members select boarding_tickets" ON public.boarding_tickets
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members insert boarding_tickets" ON public.boarding_tickets;
CREATE POLICY "agency members insert boarding_tickets" ON public.boarding_tickets
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members update boarding_tickets" ON public.boarding_tickets;
CREATE POLICY "agency members update boarding_tickets" ON public.boarding_tickets
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members delete boarding_tickets" ON public.boarding_tickets;
CREATE POLICY "agency members delete boarding_tickets" ON public.boarding_tickets
  FOR DELETE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarding_tickets TO authenticated;
GRANT ALL ON public.boarding_tickets TO service_role;

CREATE OR REPLACE TRIGGER boarding_tickets_touch
  BEFORE UPDATE ON public.boarding_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. Bucket para bilhetes de boarding
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('boarding-tickets', 'boarding-tickets', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Agency members manage boarding tickets" ON storage.objects;
CREATE POLICY "Agency members manage boarding tickets"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'boarding-tickets'
  AND public.is_agency_member(auth.uid(), (storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'boarding-tickets'
  AND public.is_agency_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);
