-- ============================================================
-- Migração: convert_proposal_to_trip
-- Converte uma cotação aceita em uma Viagem de forma atômica.
-- Copia: título, destino, datas, pax, moeda, total, voos,
--        hotéis, transfers, itinerário, includes, excludes.
-- Atualiza: proposals.status = 'converted'
-- Retorna: o UUID da nova viagem criada
-- ============================================================

CREATE OR REPLACE FUNCTION convert_proposal_to_trip(
  p_proposal_id uuid,
  p_agency_id   uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_id  uuid;
  v_proposal proposals%ROWTYPE;
  v_number   bigint;
BEGIN
  -- 1. Buscar proposta
  SELECT * INTO v_proposal
    FROM proposals
   WHERE id = p_proposal_id
     AND agency_id = p_agency_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta % não encontrada ou não pertence à agência.', p_proposal_id;
  END IF;

  -- 2. Gerar número sequencial para a viagem
  SELECT COALESCE(MAX(number), 0) + 1
    INTO v_number
    FROM trips
   WHERE agency_id = p_agency_id;

  -- 3. Criar viagem com os dados da proposta
  INSERT INTO trips (
    agency_id,
    proposal_id,
    client_id,
    number,
    title,
    destination,
    travel_start,
    travel_end,
    currency,
    total_sale,
    status,
    flights,
    hotels,
    transfers,
    itinerary,
    includes,
    excludes,
    notes
  )
  VALUES (
    p_agency_id,
    p_proposal_id,
    v_proposal.client_id,
    v_number,
    v_proposal.title,
    v_proposal.destination,
    v_proposal.travel_start,
    v_proposal.travel_end,
    COALESCE(v_proposal.currency, 'BRL'),
    COALESCE(v_proposal.total, 0),
    'confirmed',
    v_proposal.flights,
    v_proposal.hotels,
    v_proposal.transfers,
    v_proposal.itinerary,
    v_proposal.includes,
    v_proposal.excludes,
    v_proposal.notes
  )
  RETURNING id INTO v_trip_id;

  -- 4. Marcar proposta como convertida
  UPDATE proposals
     SET status   = 'converted',
         trip_id  = v_trip_id
   WHERE id = p_proposal_id;

  RETURN v_trip_id;
END;
$$;

-- Permissão para usuários autenticados chamarem via RPC
GRANT EXECUTE ON FUNCTION convert_proposal_to_trip(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION convert_proposal_to_trip IS
  'Converte atomicamente uma proposta aceita em uma Viagem, copiando todos os dados relevantes.';
