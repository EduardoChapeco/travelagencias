-- =========================================================================================
-- Microfase 8: Autoridade em Resoluções de Reacomodação Aérea (Flight Changes)
-- O frontend (portal do cliente) tentava atualizar a tabela flight_change_cases 
-- diretamente. Como o cliente não tem permissão de UPDATE, isso causava falhas.
-- Um gateway RPC seguro foi estabelecido para registrar o aceite/recusa do passageiro.
-- =========================================================================================

CREATE OR REPLACE FUNCTION public.client_decide_flight_change(_case_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_client_id uuid;
  v_workflow_status text;
BEGIN
  -- Validar o status
  IF _status NOT IN ('client_accepted', 'client_rejected') THEN
    RAISE EXCEPTION 'Status de resolução inválido.';
  END IF;

  -- Obter o titular da viagem vinculada ao caso
  SELECT t.client_id INTO v_trip_client_id
  FROM public.flight_change_cases fcc
  JOIN public.trips t ON t.id = fcc.trip_id
  WHERE fcc.id = _case_id;

  IF v_trip_client_id IS NULL THEN
    RAISE EXCEPTION 'Caso de reacomodação não encontrado.';
  END IF;

  IF v_trip_client_id <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso Negado: Você não é o titular desta viagem.';
  END IF;

  -- Atualizar apenas o status do workflow
  UPDATE public.flight_change_cases
  SET workflow_status = _status,
      updated_at = now()
  WHERE id = _case_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.client_decide_flight_change(uuid, text) TO authenticated;
