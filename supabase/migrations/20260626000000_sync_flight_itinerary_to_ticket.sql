-- Migration: 20260626000000_sync_flight_itinerary_to_ticket
-- Objetivo: Criar RPC e trigger de sincronização de itinerários vigentes para cartões e bilhetes de embarque

CREATE OR REPLACE FUNCTION public.sync_flight_to_boarding_ticket(p_itinerary_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_agency_id uuid;
  v_first_segment record;
  v_card_id uuid;
  v_passenger record;
  v_ticket_id uuid;
BEGIN
  -- 1. Obter trip_id e agency_id do itinerário
  SELECT trip_id, agency_id INTO v_trip_id, v_agency_id
  FROM public.flight_itineraries
  WHERE id = p_itinerary_id;

  IF v_trip_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Obter o primeiro segmento deste itinerário (menor segment_order)
  SELECT airline_code, flight_number, departure_at, origin_iata, destination_iata, cabin, record_locator
  INTO v_first_segment
  FROM public.flight_segments
  WHERE itinerary_id = p_itinerary_id
  ORDER BY segment_order ASC
  LIMIT 1;

  IF v_first_segment IS NULL THEN
    RETURN;
  END IF;

  -- 3. Obter ou criar o boarding_card para esta viagem
  SELECT id INTO v_card_id
  FROM public.boarding_cards
  WHERE trip_id = v_trip_id AND deleted_at IS NULL
  LIMIT 1;

  IF v_card_id IS NULL THEN
    INSERT INTO public.boarding_cards (
      agency_id,
      trip_id,
      pnr,
      airline,
      flight_number,
      flight_date,
      departure_airport,
      arrival_airport,
      flight_class,
      status,
      checklist,
      documents_checklist
    ) VALUES (
      v_agency_id,
      v_trip_id,
      v_first_segment.record_locator,
      v_first_segment.airline_code,
      v_first_segment.flight_number,
      v_first_segment.departure_at,
      v_first_segment.origin_iata,
      v_first_segment.destination_iata,
      v_first_segment.cabin,
      'pending',
      '[]'::jsonb,
      '[]'::jsonb
    ) RETURNING id INTO v_card_id;
  ELSE
    UPDATE public.boarding_cards
    SET pnr = COALESCE(v_first_segment.record_locator, pnr),
        airline = COALESCE(v_first_segment.airline_code, airline),
        flight_number = COALESCE(v_first_segment.flight_number, flight_number),
        flight_date = COALESCE(v_first_segment.departure_at, flight_date),
        departure_airport = COALESCE(v_first_segment.origin_iata, departure_airport),
        arrival_airport = COALESCE(v_first_segment.destination_iata, arrival_airport),
        flight_class = COALESCE(v_first_segment.cabin, flight_class),
        updated_at = now()
    WHERE id = v_card_id;
  END IF;

  -- 4. Para cada passageiro da viagem, sincronizar o ticket correspondente
  FOR v_passenger IN
    SELECT id, full_name
    FROM public.trip_passengers
    WHERE trip_id = v_trip_id AND deleted_at IS NULL
  LOOP
    SELECT id INTO v_ticket_id
    FROM public.boarding_tickets
    WHERE card_id = v_card_id AND passenger_id = v_passenger.id AND kind = 'airline'
    LIMIT 1;

    IF v_ticket_id IS NULL THEN
      INSERT INTO public.boarding_tickets (
        card_id,
        passenger_id,
        agency_id,
        kind,
        passenger_name,
        date_time,
        status,
        ticket_code
      ) VALUES (
        v_card_id,
        v_passenger.id,
        v_agency_id,
        'airline',
        v_passenger.full_name,
        v_first_segment.departure_at,
        'pending',
        v_first_segment.record_locator
      );
    ELSE
      UPDATE public.boarding_tickets
      SET passenger_name = v_passenger.full_name,
          date_time = v_first_segment.departure_at,
          ticket_code = COALESCE(v_first_segment.record_locator, ticket_code),
          updated_at = now()
      WHERE id = v_ticket_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_flight_to_boarding_ticket(uuid) TO authenticated, service_role;

-- Trigger para chamar automaticamente a sincronização ao ativar itinerário
CREATE OR REPLACE FUNCTION public.handle_flight_itinerary_sync()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM public.sync_flight_to_boarding_ticket(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_flight_itinerary_sync ON public.flight_itineraries;
CREATE TRIGGER trg_flight_itinerary_sync
  AFTER INSERT OR UPDATE ON public.flight_itineraries
  FOR EACH ROW EXECUTE FUNCTION public.handle_flight_itinerary_sync();
