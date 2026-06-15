-- Migration: 20260615000011_client_boarding_rpc
-- 1. Recreate duplicate_trip RPC to copy passengers
-- 2. Add get_client_boarding_card security-definer RPC for travelers
-- 3. Add update_client_boarding_checklist security-definer RPC for travelers

CREATE OR REPLACE FUNCTION public.duplicate_trip(p_trip_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- 1. Duplicar viagem principal
  INSERT INTO public.trips (
    agency_id, title, destination, travel_start, travel_end,
    status, currency, total_sale, total_cost, total_paid,
    notes, code, client_id, owner_id, proposal_id
  )
  SELECT
    agency_id,
    title || ' (Cópia)',
    destination, travel_start, travel_end,
    'planning',
    currency, total_sale, total_cost, 0,
    notes, code, client_id, owner_id, NULL
  FROM public.trips
  WHERE id = p_trip_id
  RETURNING id INTO v_new_id;

  -- 2. Duplicar passageiros associados (excluindo os deletados)
  INSERT INTO public.trip_passengers (
    agency_id, trip_id, client_id, kind, full_name, document,
    document_type, birth_date, nationality, email, phone,
    is_lead_passenger, notes, magic_link_token, magic_link_filled_at,
    cpf, passport_number, passport_expiry, meal_preference,
    disabilities, document_images, vaccination_certificates, data_complete
  )
  SELECT
    agency_id, v_new_id, client_id, kind, full_name, document,
    document_type, birth_date, nationality, email, phone,
    is_lead_passenger, notes, replace(gen_random_uuid()::text,'-',''), NULL,
    cpf, passport_number, passport_expiry, meal_preference,
    disabilities, '[]'::jsonb, '[]'::jsonb, false
  FROM public.trip_passengers
  WHERE trip_id = p_trip_id AND deleted_at IS NULL;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_trip(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_client_boarding_card(p_trip_id uuid)
RETURNS TABLE (
  id uuid,
  pnr text,
  airline text,
  status text,
  alerts text[],
  checklist jsonb,
  trip_id uuid,
  agency_id uuid,
  briefing_date timestamptz,
  briefing_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Obter o ID de cliente associado ao usuário logado
  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.user_id = auth.uid();

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  -- Confirmar se o cliente é o titular da viagem e se ela não foi deletada
  IF EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = p_trip_id AND t.client_id = v_client_id AND t.deleted_at IS NULL
  ) THEN
    RETURN QUERY
    SELECT bc.id, bc.pnr, bc.airline, bc.status, bc.alerts, bc.checklist, bc.trip_id, bc.agency_id, bc.briefing_date, bc.briefing_url
    FROM public.boarding_cards bc
    WHERE bc.trip_id = p_trip_id AND bc.deleted_at IS NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_boarding_card(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.update_client_boarding_checklist(p_boarding_card_id uuid, p_checklist jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_trip_id uuid;
BEGIN
  -- Carregar viagem associada ao cartão
  SELECT bc.trip_id INTO v_trip_id
  FROM public.boarding_cards bc
  WHERE bc.id = p_boarding_card_id AND bc.deleted_at IS NULL;

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Cartão de embarque não encontrado ou deletado.';
  END IF;

  -- Obter o ID de cliente do usuário logado
  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.user_id = auth.uid();

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Apenas clientes titulares podem atualizar o checklist.';
  END IF;

  -- Validar titularidade da viagem
  IF EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = v_trip_id AND t.client_id = v_client_id AND t.deleted_at IS NULL
  ) THEN
    UPDATE public.boarding_cards
    SET checklist = p_checklist, updated_at = now()
    WHERE id = p_boarding_card_id;
  ELSE
    RAISE EXCEPTION 'Acesso não autorizado.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_client_boarding_checklist(uuid, jsonb) TO authenticated;
