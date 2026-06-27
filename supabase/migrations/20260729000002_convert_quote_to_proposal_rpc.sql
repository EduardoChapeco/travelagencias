-- Migration: 20260729000002_convert_quote_to_proposal_rpc.sql
-- Description: Transação atômica de conversão de Cotação para Proposta (Evita orfandade e double writes na UI)

CREATE OR REPLACE FUNCTION public.convert_quote_to_proposal(
  p_quote_request_id uuid,
  p_proposal_payload jsonb,
  p_owner_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal_id uuid;
  v_agency_id uuid;
BEGIN
  -- 1. Obter agency_id da cotação e verificar sua existência
  SELECT agency_id INTO v_agency_id 
  FROM public.quote_requests 
  WHERE id = p_quote_request_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Cotação não encontrada';
  END IF;

  -- 2. Validar se o usuário executor possui acesso à agência da cotação (RLS Gate)
  IF NOT public.is_agency_member(auth.uid(), v_agency_id) THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não é membro da agência proprietária';
  END IF;

  -- 3. Inserir a Proposta com todos os seus dados e componentes de forma atômica
  INSERT INTO public.proposals (
    agency_id,
    title,
    destination,
    client_id,
    lead_id,
    travel_start,
    travel_end,
    pax_adults,
    pax_seniors,
    pax_children,
    pax_infants,
    currency,
    valid_until,
    notes,
    visibility,
    owner_id,
    is_public_template,
    flights,
    hotels,
    transfers,
    tours,
    itinerary,
    includes,
    excludes,
    total
  ) VALUES (
    v_agency_id,
    p_proposal_payload->>'title',
    NULLIF(p_proposal_payload->>'destination', ''),
    (NULLIF(p_proposal_payload->>'client_id', ''))::uuid,
    (NULLIF(p_proposal_payload->>'lead_id', ''))::uuid,
    NULLIF(p_proposal_payload->>'travel_start', ''),
    NULLIF(p_proposal_payload->>'travel_end', ''),
    COALESCE((p_proposal_payload->>'pax_adults')::int, 0),
    COALESCE((p_proposal_payload->>'pax_seniors')::int, 0),
    COALESCE((p_proposal_payload->>'pax_children')::int, 0),
    COALESCE((p_proposal_payload->>'pax_infants')::int, 0),
    COALESCE(p_proposal_payload->>'currency', 'BRL'),
    (p_proposal_payload->>'valid_until')::date,
    p_proposal_payload->>'notes',
    COALESCE(p_proposal_payload->>'visibility', 'private'),
    p_owner_id,
    false,
    COALESCE(p_proposal_payload->'flights', '[]'::jsonb),
    COALESCE(p_proposal_payload->'hotels', '[]'::jsonb),
    COALESCE(p_proposal_payload->'transfers', '[]'::jsonb),
    COALESCE(p_proposal_payload->'tours', '[]'::jsonb),
    COALESCE(p_proposal_payload->'itinerary', '[]'::jsonb),
    COALESCE(p_proposal_payload->'includes', '[]'::jsonb),
    COALESCE(p_proposal_payload->'excludes', '[]'::jsonb),
    COALESCE((p_proposal_payload->>'total')::numeric(12,2), 0.00)
  ) RETURNING id INTO v_proposal_id;

  -- 4. Transicionar status da cotação original para concluída (Máquina de Estados)
  UPDATE public.quote_requests
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_quote_request_id;

  -- 5. Registrar atividade histórica na proposta (Auditoria)
  INSERT INTO public.proposal_history (
    agency_id,
    proposal_id,
    agent_id,
    action,
    details
  ) VALUES (
    v_agency_id,
    v_proposal_id,
    p_owner_id,
    'created',
    jsonb_build_object('title', p_proposal_payload->>'title', 'source', 'vibetour_conversion')
  );

  RETURN v_proposal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_quote_to_proposal(uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_proposal(uuid, jsonb, uuid) TO service_role;

COMMENT ON FUNCTION public.convert_quote_to_proposal(uuid, jsonb, uuid) IS
  'Converte de forma atômica e transacional um candidato a pacote de cotação em uma proposta, atualizando o status da cotação.';
