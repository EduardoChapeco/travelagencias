-- Migration: 20260625000003_checkin_links_and_boarding_events
-- Objetivo: Criar as tabelas checkin_links e boarding_events, habilitar RLS, criar politicas e expor RPCs de e-checkin e reacomodacao publicas

CREATE TABLE IF NOT EXISTS public.checkin_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_segment_id uuid REFERENCES public.flight_segments(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider text NOT NULL,  -- latam | gol | azul | ...
  link_type text NOT NULL DEFAULT 'web_checkin',  -- web_checkin | app_checkin | third_party
  generated_url text,
  raw_url text,
  parameters jsonb DEFAULT '{}'::jsonb,
  validation_status text DEFAULT 'unverified',
  last_verified_at timestamptz,
  expires_at timestamptz,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.boarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  traveler_id uuid REFERENCES public.trip_passengers(id) ON DELETE CASCADE,
  flight_segment_id uuid REFERENCES public.flight_segments(id) ON DELETE CASCADE,
  event_type text NOT NULL,  -- checked_in | boarded | no_show | issue | checkin_link_clicked | reaccommodation_accepted
  status text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.checkin_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_events ENABLE ROW LEVEL SECURITY;

-- checkin_links RLS policies
CREATE POLICY "Agency members can select checkin_links"
  ON public.checkin_links FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can insert checkin_links"
  ON public.checkin_links FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can update checkin_links"
  ON public.checkin_links FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can delete checkin_links"
  ON public.checkin_links FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid()
    )
  );

-- boarding_events RLS policies
CREATE POLICY "Agency members can select boarding_events"
  ON public.boarding_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = boarding_events.trip_id
        AND t.agency_id IN (
          SELECT agency_id FROM public.agency_members
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Agency members can insert boarding_events"
  ON public.boarding_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = boarding_events.trip_id
        AND t.agency_id IN (
          SELECT agency_id FROM public.agency_members
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Agency members can update boarding_events"
  ON public.boarding_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = boarding_events.trip_id
        AND t.agency_id IN (
          SELECT agency_id FROM public.agency_members
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Agency members can delete boarding_events"
  ON public.boarding_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = boarding_events.trip_id
        AND t.agency_id IN (
          SELECT agency_id FROM public.agency_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_links TO authenticated;
GRANT ALL ON public.checkin_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarding_events TO authenticated;
GRANT ALL ON public.boarding_events TO service_role;

-- RPC for public check-in card details (SECURITY DEFINER to bypass RLS for clients)
CREATE OR REPLACE FUNCTION public.get_public_boarding_card_details(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card jsonb;
  v_passengers jsonb;
  v_segments jsonb;
  v_trip_id uuid;
  v_reaccommodation jsonb;
BEGIN
  -- Get Boarding Card
  SELECT json_build_object(
    'id', bc.id,
    'pnr', bc.pnr,
    'airline', bc.airline,
    'status', bc.status,
    'alerts', bc.alerts,
    'checklist', bc.checklist,
    'trip_id', bc.trip_id,
    'agency_id', bc.agency_id
  )::jsonb INTO v_card
  FROM public.boarding_cards bc
  WHERE bc.id = p_id AND bc.deleted_at IS NULL;

  IF v_card IS NULL THEN
    RETURN NULL;
  END IF;

  v_trip_id := (v_card->>'trip_id')::uuid;

  -- Get Passengers
  SELECT json_agg(json_build_object(
    'id', tp.id,
    'full_name', tp.full_name,
    'document', tp.document
  ))::jsonb INTO v_passengers
  FROM public.trip_passengers tp
  WHERE tp.trip_id = v_trip_id;

  -- Get Confirmed Flight Segments and their checkin_links if any
  SELECT json_agg(json_build_object(
    'id', fs.id,
    'airline_code', fs.airline_code,
    'flight_number', fs.flight_number,
    'origin_iata', fs.origin_iata,
    'destination_iata', fs.destination_iata,
    'departure_at', fs.departure_at,
    'arrival_at', fs.arrival_at,
    'cabin', fs.cabin,
    'baggage', fs.baggage,
    'record_locator', fs.record_locator,
    'airport_terminal', fs.airport_terminal,
    'status', fs.status,
    'checkin_link', (
      SELECT json_build_object('id', cl.id, 'raw_url', cl.raw_url, 'provider', cl.provider, 'link_type', cl.link_type)
      FROM public.checkin_links cl
      WHERE cl.flight_segment_id = fs.id
      LIMIT 1
    )
  ) ORDER BY fs.segment_order)::jsonb INTO v_segments
  FROM public.flight_segments fs
  JOIN public.flight_itineraries fi ON fs.itinerary_id = fi.id
  WHERE fi.trip_id = v_trip_id 
    AND fi.type = 'confirmed' 
    AND fi.status = 'active';

  -- Fallback if no confirmed active itinerary
  IF v_segments IS NULL THEN
    SELECT json_agg(json_build_object(
      'id', fs.id,
      'airline_code', fs.airline_code,
      'flight_number', fs.flight_number,
      'origin_iata', fs.origin_iata,
      'destination_iata', fs.destination_iata,
      'departure_at', fs.departure_at,
      'arrival_at', fs.arrival_at,
      'cabin', fs.cabin,
      'baggage', fs.baggage,
      'record_locator', fs.record_locator,
      'airport_terminal', fs.airport_terminal,
      'status', fs.status,
      'checkin_link', (
        SELECT json_build_object('id', cl.id, 'raw_url', cl.raw_url, 'provider', cl.provider, 'link_type', cl.link_type)
        FROM public.checkin_links cl
        WHERE cl.flight_segment_id = fs.id
        LIMIT 1
      )
    ) ORDER BY fs.segment_order)::jsonb INTO v_segments
    FROM public.flight_segments fs
    JOIN public.flight_itineraries fi ON fs.itinerary_id = fi.id
    WHERE fi.trip_id = v_trip_id 
      AND fi.status = 'active';
  END IF;

  -- Get Reaccommodation suggestions (operator suggestions)
  SELECT json_agg(json_build_object(
    'itinerary_id', fi.id,
    'version', fi.version,
    'segments', (
      SELECT json_agg(json_build_object(
        'id', fs.id,
        'airline_code', fs.airline_code,
        'flight_number', fs.flight_number,
        'origin_iata', fs.origin_iata,
        'destination_iata', fs.destination_iata,
        'departure_at', fs.departure_at,
        'arrival_at', fs.arrival_at
      ) ORDER BY fs.segment_order)
      FROM public.flight_segments fs
      WHERE fs.itinerary_id = fi.id
    )
  ))::jsonb INTO v_reaccommodation
  FROM public.flight_itineraries fi
  WHERE fi.trip_id = v_trip_id 
    AND fi.type = 'operator_suggestion' 
    AND fi.status = 'active';

  RETURN json_build_object(
    'card', v_card,
    'passengers', COALESCE(v_passengers, '[]'::jsonb),
    'segments', COALESCE(v_segments, '[]'::jsonb),
    'reaccommodations', COALESCE(v_reaccommodation, '[]'::jsonb)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_boarding_card_details(uuid) TO anon, authenticated;

-- RPC to record public boarding events
CREATE OR REPLACE FUNCTION public.create_public_boarding_event(
  p_boarding_card_id uuid,
  p_traveler_id uuid,
  p_flight_segment_id uuid,
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
BEGIN
  SELECT trip_id INTO v_trip_id FROM public.boarding_cards WHERE id = p_boarding_card_id AND deleted_at IS NULL;
  
  IF v_trip_id IS NOT NULL THEN
    INSERT INTO public.boarding_events (trip_id, traveler_id, flight_segment_id, event_type, metadata)
    VALUES (v_trip_id, p_traveler_id, p_flight_segment_id, p_event_type, p_metadata);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_public_boarding_event(uuid, uuid, uuid, text, jsonb) TO anon, authenticated;

-- RPC to accept public reaccommodation
CREATE OR REPLACE FUNCTION public.accept_public_reaccommodation(
  p_boarding_card_id uuid,
  p_itinerary_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
BEGIN
  -- Get trip_id associated with boarding card
  SELECT trip_id INTO v_trip_id FROM public.boarding_cards WHERE id = p_boarding_card_id AND deleted_at IS NULL;
  
  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Card not found';
  END IF;
  
  -- Verify itinerary belongs to this trip and is an operator suggestion
  IF NOT EXISTS (
    SELECT 1 FROM public.flight_itineraries 
    WHERE id = p_itinerary_id AND trip_id = v_trip_id AND type = 'operator_suggestion'
  ) THEN
    RAISE EXCEPTION 'Invalid itinerary';
  END IF;

  -- 1. Archive the existing confirmed itinerary
  UPDATE public.flight_itineraries
  SET status = 'archived'
  WHERE trip_id = v_trip_id AND type = 'confirmed';

  -- 2. Set the accepted itinerary type to confirmed
  UPDATE public.flight_itineraries
  SET type = 'confirmed', updated_at = now()
  WHERE id = p_itinerary_id;
  
  -- 3. Register a boarding event
  INSERT INTO public.boarding_events (trip_id, event_type, metadata)
  VALUES (
    v_trip_id, 
    'reaccommodation_accepted', 
    json_build_object('accepted_itinerary_id', p_itinerary_id)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_public_reaccommodation(uuid, uuid) TO anon, authenticated;

-- RPC to submit emergency flight issue
CREATE OR REPLACE FUNCTION public.submit_emergency_flight_issue(
  p_boarding_card_id uuid,
  p_issue_type text, -- 'delayed' or 'cancelled'
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card record;
  v_subject text;
  v_desc text;
  v_ticket_id uuid;
BEGIN
  -- 1. Get Boarding Card and Agency Details
  SELECT bc.id, bc.pnr, bc.airline, bc.trip_id, bc.agency_id
  INTO v_card
  FROM public.boarding_cards bc
  WHERE bc.id = p_boarding_card_id AND bc.deleted_at IS NULL;

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'Boarding card not found';
  END IF;

  -- 2. Log Boarding Event
  INSERT INTO public.boarding_events (trip_id, event_type, metadata)
  VALUES (
    v_card.trip_id,
    'flight_issue',
    jsonb_build_object(
      'boarding_card_id', p_boarding_card_id,
      'issue_type', p_issue_type,
      'pnr', v_card.pnr,
      'airline', v_card.airline,
      'description', p_description
    )
  );

  -- 3. Prepare ticket details
  v_subject := 'EMERGÊNCIA: Voo ' || COALESCE(p_issue_type, 'com problema') || ' - PNR ' || COALESCE(v_card.pnr, 'S/PNR');
  v_desc := 'O passageiro reportou que o voo da companhia ' || COALESCE(v_card.airline, 'desconhecida') || 
            ' (PNR: ' || COALESCE(v_card.pnr, 'não informado') || ') foi ' || 
            CASE WHEN p_issue_type = 'delayed' THEN 'atrasado' ELSE 'cancelado' END || '.';
            
  IF p_description IS NOT NULL AND p_description <> '' THEN
    v_desc := v_desc || ' Observações do passageiro: ' || p_description;
  END IF;

  -- 4. Create high-priority ticket
  INSERT INTO public.support_tickets (
    agency_id,
    title,
    description,
    status,
    priority,
    metadata
  ) VALUES (
    v_card.agency_id,
    v_subject,
    v_desc,
    'open',
    'high', -- High priority for emergencies!
    jsonb_build_object('source', 'emergency_button', 'boarding_card_id', p_boarding_card_id)
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_emergency_flight_issue(uuid, text, text) TO anon, authenticated;
