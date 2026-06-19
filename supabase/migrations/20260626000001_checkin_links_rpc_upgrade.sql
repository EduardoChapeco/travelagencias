-- Migration: 20260626000001_checkin_links_rpc_upgrade
-- Objetivo: Adicionar checkin_opens_at em boarding_cards e atualizar a RPC get_client_boarding_card para expor links reais de check-in

ALTER TABLE public.boarding_cards
  ADD COLUMN IF NOT EXISTS checkin_opens_at timestamptz;

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
  briefing_url text,
  checkin_opens_at timestamptz,
  checkin_links jsonb
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
    SELECT 
      bc.id, 
      bc.pnr, 
      bc.airline, 
      bc.status, 
      bc.alerts, 
      bc.checklist, 
      bc.trip_id, 
      bc.agency_id, 
      bc.briefing_date, 
      bc.briefing_url,
      bc.checkin_opens_at,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', cl.id,
          'provider', cl.provider,
          'link_type', cl.link_type,
          'raw_url', cl.raw_url,
          'flight_segment_id', cl.flight_segment_id
        )), '[]'::jsonb)
        FROM public.checkin_links cl
        JOIN public.flight_segments fs ON cl.flight_segment_id = fs.id
        JOIN public.flight_itineraries fi ON fs.itinerary_id = fi.id
        WHERE fi.trip_id = p_trip_id AND fi.status = 'active'
      ) AS checkin_links
    FROM public.boarding_cards bc
    WHERE bc.trip_id = p_trip_id AND bc.deleted_at IS NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_boarding_card(uuid) TO authenticated, service_role;
