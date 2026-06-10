-- Fase H.1: RPCs Seguros para B2C Boarding (Web Check-in)

CREATE OR REPLACE FUNCTION public.get_public_boarding_card(p_id uuid)
RETURNS TABLE (
  id uuid,
  pnr text,
  airline text,
  status text,
  alerts text[],
  checklist jsonb,
  trip_id uuid,
  agency_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT bc.id, bc.pnr, bc.airline, bc.status, bc.alerts, bc.checklist, bc.trip_id, bc.agency_id
  FROM public.boarding_cards bc
  WHERE bc.id = p_id AND bc.deleted_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_boarding_card(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_public_boarding_card_checklist(p_id uuid, p_checklist jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permite apenas atualizar o checklist (e opcionalmente mudar o status se tudo estiver done, 
  -- mas deixaremos o status intocado para o agente revisar).
  UPDATE public.boarding_cards
  SET checklist = p_checklist, updated_at = now()
  WHERE id = p_id AND deleted_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_public_boarding_card_checklist(uuid, jsonb) TO anon, authenticated;
