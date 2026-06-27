-- Migration: save_infotravel_booking_atomic
-- Description: Cria a função save_infotravel_booking_normalized para gravação atômica
-- Autor: Antigravity AI
-- Data: 2026-07-25

CREATE OR REPLACE FUNCTION public.save_infotravel_booking_normalized(
  p_agency_id UUID,
  p_normalized JSONB,
  p_override_trip_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_client_id UUID;
  v_trip_id UUID;
  v_passenger RECORD;
  v_normalized_passengers JSONB;
  v_normalized_flights JSONB;
  v_normalized_hotels JSONB;
  v_client_name TEXT;
  v_client_cpf TEXT;
  v_client_email TEXT;
  v_client_phone TEXT;
  v_locator TEXT;
  v_destination TEXT;
  v_total_sale NUMERIC;
  v_status TEXT;
  v_travel_start DATE;
  v_travel_end DATE;
  v_booking_id TEXT;
  v_voucher_id UUID;
  v_voucher_flights JSONB;
  v_voucher_accommodation JSONB;
  v_voucher_passengers JSONB;
BEGIN
  -- Extrair parâmetros de primeiro nível
  v_booking_id := p_normalized->>'booking_id';
  v_locator := p_normalized->>'locator';
  v_destination := p_normalized->>'destination';
  v_client_name := p_normalized->>'client_name';
  v_client_cpf := p_normalized->>'client_cpf';
  v_client_email := p_normalized->>'client_email';
  v_client_phone := p_normalized->>'client_phone';
  v_total_sale := COALESCE((p_normalized->>'total_sale')::NUMERIC, 0);
  v_status := p_normalized->>'status';
  v_travel_start := (p_normalized->>'travel_start')::DATE;
  v_travel_end := (p_normalized->>'travel_end')::DATE;
  v_normalized_passengers := p_normalized->'passengers';
  v_normalized_flights := p_normalized->'flights';
  v_normalized_hotels := p_normalized->'hotels';

  -- 1. Resolução do Cliente Principal
  v_client_id := NULL;
  IF v_client_cpf IS NOT NULL AND v_client_cpf <> '' THEN
    SELECT id INTO v_client_id FROM public.clients 
     WHERE agency_id = p_agency_id AND document = v_client_cpf AND deleted_at IS NULL LIMIT 1;
  END IF;

  IF v_client_id IS NULL AND v_client_email IS NOT NULL AND v_client_email <> '' THEN
    SELECT id INTO v_client_id FROM public.clients 
     WHERE agency_id = p_agency_id AND email = v_client_email AND deleted_at IS NULL LIMIT 1;
  END IF;

  -- Se não existir, criar novo cliente
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (
      agency_id, full_name, document, email, phone, kind, created_at, updated_at
    ) VALUES (
      p_agency_id, COALESCE(v_client_name, 'Cliente Importado'), NULLIF(v_client_cpf, ''), NULLIF(v_client_email, ''), NULLIF(v_client_phone, ''), 'individual', now(), now()
    ) RETURNING id INTO v_client_id;
  END IF;

  -- 2. Resolução da Viagem (Trip)
  v_trip_id := p_override_trip_id;

  IF v_trip_id IS NULL THEN
    SELECT internal_id INTO v_trip_id FROM public.external_entity_links
     WHERE agency_id = p_agency_id AND provider = 'infotravel' AND entity_type = 'trip' AND external_id = v_locator LIMIT 1;
  END IF;

  IF v_trip_id IS NOT NULL THEN
    -- Atualizar viagem existente
    UPDATE public.trips SET
      status = COALESCE(v_status, status),
      travel_start = COALESCE(v_travel_start, travel_start),
      travel_end = COALESCE(v_travel_end, travel_end),
      total_sale = v_total_sale,
      updated_at = now()
    WHERE id = v_trip_id;
  ELSE
    -- Inserir nova viagem
    INSERT INTO public.trips (
      agency_id, client_id, title, destination, travel_start, travel_end, total_sale, total_cost, currency, status, notes, created_at, updated_at
    ) VALUES (
      p_agency_id, v_client_id, 'Reserva #' || v_booking_id || ' - ' || COALESCE(v_destination, 'Infotravel'), COALESCE(v_destination, 'Vários'), v_travel_start, v_travel_end, v_total_sale, 0, 'BRL', v_status, 'Importado automaticamente via GDS Infotravel. Localizador: ' || v_locator, now(), now()
    ) RETURNING id INTO v_trip_id;
  END IF;

  -- Garantir que a ligação em external_entity_links existe
  IF NOT EXISTS (
    SELECT 1 FROM public.external_entity_links 
    WHERE agency_id = p_agency_id AND provider = 'infotravel' AND entity_type = 'trip' AND internal_id = v_trip_id
  ) THEN
    INSERT INTO public.external_entity_links (
      agency_id, provider, entity_type, external_id, internal_id, sync_status, metadata, created_at, updated_at
    ) VALUES (
      p_agency_id, 'infotravel', 'trip', v_locator, v_trip_id, 'synced', jsonb_build_object('booking_id', v_booking_id, 'imported_at', now()), now(), now()
    );
  END IF;

  -- 3. Cadastro / Atualização de Passageiros
  IF v_normalized_passengers IS NOT NULL AND jsonb_array_length(v_normalized_passengers) > 0 THEN
    FOR v_passenger IN SELECT * FROM jsonb_to_recordset(v_normalized_passengers) AS x(full_name text, document text, document_type text, birth_date text, email text, phone text) LOOP
      IF EXISTS(SELECT 1 FROM public.trip_passengers WHERE trip_id = v_trip_id AND full_name = v_passenger.full_name) THEN
        UPDATE public.trip_passengers SET
          document = NULLIF(v_passenger.document, ''),
          document_type = COALESCE(NULLIF(v_passenger.document_type, ''), 'rg'),
          birth_date = CASE WHEN NULLIF(v_passenger.birth_date, '') IS NOT NULL THEN v_passenger.birth_date::DATE ELSE NULL END,
          email = NULLIF(v_passenger.email, ''),
          phone = NULLIF(v_passenger.phone, ''),
          updated_at = now()
        WHERE trip_id = v_trip_id AND full_name = v_passenger.full_name;
      ELSE
        INSERT INTO public.trip_passengers (
          trip_id, agency_id, full_name, document, document_type, birth_date, email, phone, is_lead_passenger, notes, created_at, updated_at
        ) VALUES (
          v_trip_id, p_agency_id, v_passenger.full_name, NULLIF(v_passenger.document, ''), COALESCE(NULLIF(v_passenger.document_type, ''), 'rg'), CASE WHEN NULLIF(v_passenger.birth_date, '') IS NOT NULL THEN v_passenger.birth_date::DATE ELSE NULL END, NULLIF(v_passenger.email, ''), NULLIF(v_passenger.phone, ''), (v_passenger.full_name = v_client_name), 'Importado automaticamente via GDS Infotravel. Pendente de conferência física.', now(), now()
        );
      END IF;
    END LOOP;
  END IF;

  -- 4. Construção dos Arrays para o Voucher
  -- Voos
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'locator', COALESCE(v_locator, 'PNR'),
      'airline', f->>'airline',
      'flight_number', f->>'flight_number',
      'origin', f->>'origin',
      'destination', f->>'destination',
      'date', f->>'date',
      'departure_time', f->>'departure_time',
      'arrival_time', f->>'arrival_time',
      'class', 'Econômica',
      'baggage', COALESCE(f->>'baggage_rules', 'Sem bagagem')
    )
  ), '[]'::jsonb) INTO v_voucher_flights
  FROM jsonb_array_elements(COALESCE(v_normalized_flights, '[]'::jsonb)) f;

  -- Hotéis
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', h->>'name',
      'city', h->>'city',
      'address', '',
      'phone', '',
      'checkin', h->>'checkin',
      'checkout', h->>'checkout',
      'room_type', COALESCE(h->'rooms'->0->>'type', 'Standard'),
      'meal_plan', COALESCE(h->>'meal_plan', 'Somente Hospedagem'),
      'confirmation', COALESCE(v_locator, 'CONFIRMADO')
    )
  ), '[]'::jsonb) INTO v_voucher_accommodation
  FROM jsonb_array_elements(COALESCE(v_normalized_hotels, '[]'::jsonb)) h;

  -- Passageiros do Voucher
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', p->>'full_name',
      'document', COALESCE(p->>'document', '')
    )
  ), '[]'::jsonb) INTO v_voucher_passengers
  FROM jsonb_array_elements(COALESCE(v_normalized_passengers, '[]'::jsonb)) p;

  -- 5. Cadastro / Atualização do Voucher
  v_voucher_id := NULL;
  SELECT id INTO v_voucher_id FROM public.vouchers WHERE trip_id = v_trip_id AND deleted_at IS NULL LIMIT 1;

  IF v_voucher_id IS NOT NULL THEN
    UPDATE public.vouchers SET
      destination = COALESCE(v_destination, 'Vários'),
      general_locator = COALESCE(v_locator, v_booking_id),
      passengers = v_voucher_passengers,
      flights = v_voucher_flights,
      accommodation = v_voucher_accommodation,
      updated_at = now()
    WHERE id = v_voucher_id;
  ELSE
    INSERT INTO public.vouchers (
      agency_id, trip_id, source_type, destination, general_locator, passengers, flights, accommodation, transfers, tours, insurance, emergency_contacts, created_at, updated_at
    ) VALUES (
      p_agency_id, v_trip_id, 'manual', COALESCE(v_destination, 'Vários'), COALESCE(v_locator, v_booking_id),
      v_voucher_passengers, v_voucher_flights, v_voucher_accommodation,
      '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, now(), now()
    );
  END IF;

  RETURN v_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION public.save_infotravel_booking_normalized(UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_infotravel_booking_normalized(UUID, JSONB, UUID) TO service_role;
