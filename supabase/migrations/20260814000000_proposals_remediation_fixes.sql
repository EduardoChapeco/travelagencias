-- ============================================================
-- Migration: Proposals Conversion and Accounts Receivable Integration (F021)
-- Integrates convert_proposal_to_trip with payment_plans and payment_installments
-- ============================================================

CREATE OR REPLACE FUNCTION public.convert_proposal_to_trip(
  p_proposal_id uuid,
  p_agency_id   uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id    uuid;
  v_proposal   proposals%ROWTYPE;
  v_number     bigint;
  v_pax        jsonb;
  v_lead       leads%ROWTYPE;
  v_plan_id    uuid;
  v_client_id  uuid;
BEGIN
  -- 1. Fetch proposal
  SELECT * INTO v_proposal
    FROM proposals
   WHERE id = p_proposal_id
     AND agency_id = p_agency_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta % não encontrada ou não pertence à agência.', p_proposal_id;
  END IF;

  v_client_id := v_proposal.client_id;

  -- Promote lead to client if client is not set and lead is linked
  IF v_client_id IS NULL AND v_proposal.lead_id IS NOT NULL THEN
    v_client_id := public.promote_lead_to_client_v2(v_proposal.lead_id, '{}'::jsonb);
    
    -- Also update the proposal's client_id so it stays linked
    UPDATE proposals
       SET client_id = v_client_id
     WHERE id = p_proposal_id;
  END IF;

  -- 2. Generate sequential trip number
  SELECT COALESCE(MAX(number), 0) + 1
    INTO v_number
    FROM trips
   WHERE agency_id = p_agency_id;

  -- 3. Fetch lead data if linked (to get pax_list)
  IF v_proposal.lead_id IS NOT NULL THEN
    SELECT * INTO v_lead
      FROM leads
     WHERE id = v_proposal.lead_id;
  END IF;

  -- 4. Create trip with all data from proposal
  INSERT INTO trips (
    agency_id,
    proposal_id,
    lead_id,
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
    tours,
    insurance,
    itinerary,
    includes,
    excludes,
    notes
  )
  VALUES (
    p_agency_id,
    p_proposal_id,
    v_proposal.lead_id,
    v_client_id,
    v_number,
    v_proposal.title,
    v_proposal.destination,
    v_proposal.travel_start,
    v_proposal.travel_end,
    COALESCE(v_proposal.currency, 'BRL'),
    COALESCE(v_proposal.total, 0),
    'confirmed',
    COALESCE(v_proposal.flights, '[]'::jsonb),
    COALESCE(v_proposal.hotels, '[]'::jsonb),
    COALESCE(v_proposal.transfers, '[]'::jsonb),
    COALESCE(v_proposal.tours, '[]'::jsonb),
    COALESCE(v_proposal.insurance, '{}'::jsonb),
    COALESCE(v_proposal.itinerary, '[]'::jsonb),
    COALESCE(v_proposal.includes, '[]'::jsonb),
    COALESCE(v_proposal.excludes, '[]'::jsonb),
    v_proposal.notes
  )
  RETURNING id INTO v_trip_id;

  -- 5. Mark proposal as converted
  UPDATE proposals
     SET status  = 'converted',
         trip_id = v_trip_id
   WHERE id = p_proposal_id;

  -- 6. Create financial record (Accounts Receivable) if total > 0
  IF COALESCE(v_proposal.total, 0) > 0 THEN
    INSERT INTO financial_records (
      agency_id, client_id, trip_id, type, category,
      description, amount, currency, status, due_date, is_third_party
    ) VALUES (
      p_agency_id,
      v_client_id,
      v_trip_id,
      'income',
      'Vendas',
      'Faturamento referente à Proposta #' || v_proposal.number,
      v_proposal.total,
      COALESCE(v_proposal.currency, 'BRL'),
      'pending',
      COALESCE(v_proposal.travel_start, CURRENT_DATE),
      false
    );

    -- 6.1. Create payment plan automatically based on proposal total
    INSERT INTO payment_plans (
      agency_id,
      trip_id,
      client_id,
      total_amount,
      installments_count,
      status
    ) VALUES (
      p_agency_id,
      v_trip_id,
      v_client_id,
      v_proposal.total,
      1,
      'active'
    ) RETURNING id INTO v_plan_id;

    -- 6.2. Create matching pending payment installment for accounts receivable tracking
    INSERT INTO payment_installments (
      payment_plan_id,
      number,
      amount,
      due_date,
      status,
      payment_method,
      amount_paid
    ) VALUES (
      v_plan_id,
      1,
      v_proposal.total,
      COALESCE(v_proposal.travel_start, CURRENT_DATE),
      'pending',
      'pix',
      0
    );
  END IF;

  -- 7. Create trip_passengers from lead's pax_list (if lead has pax_list populated)
  IF v_proposal.lead_id IS NOT NULL
     AND v_lead.id IS NOT NULL
     AND jsonb_typeof(COALESCE(v_lead.pax_list, 'null'::jsonb)) = 'array'
     AND jsonb_array_length(COALESCE(v_lead.pax_list, '[]'::jsonb)) > 0
  THEN
    FOR v_pax IN SELECT jsonb_array_elements(v_lead.pax_list) LOOP
      INSERT INTO trip_passengers (
        trip_id,
        agency_id,
        full_name,
        document,
        birth_date,
        email,
        phone,
        relationship,
        kind,
        is_lead_passenger,
        notes
      )
      VALUES (
        v_trip_id,
        p_agency_id,
        COALESCE(v_pax->>'full_name', 'Sem Nome'),
        COALESCE(v_pax->>'document', NULL),
        CASE
          WHEN (v_pax->>'birth_date') IS NOT NULL AND (v_pax->>'birth_date') != ''
          THEN (v_pax->>'birth_date')::date
          ELSE NULL
        END,
        COALESCE(v_pax->>'email', NULL),
        COALESCE(v_pax->>'phone', NULL),
        COALESCE(v_pax->>'relationship', 'other'),
        'adult',
        false,
        'Importado automaticamente do formulário do lead. Revise antes de confirmar.'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_proposal_to_trip(uuid, uuid) TO authenticated;
