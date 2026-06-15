-- =============================================================================
-- Migration: 20260615000014_full_flow_audit_fixes
-- Goal: Fix all critical issues found in the full flow audit
-- 1. Add lead_id to trips (for CRM funnel tracking)
-- 2. Update convert_proposal_to_trip to propagate lead_id and create trip_passengers
-- 3. Trigger to recalculate trips.total_paid when installment is marked paid
-- 4. Index for performance on lead_id lookup
-- =============================================================================

-- ── 1. Add lead_id to trips ────────────────────────────────────────────────────
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trips_lead_id ON public.trips(lead_id);

-- ── 2. Update convert_proposal_to_trip to propagate lead_id ──────────────────
-- and create trip_passengers from lead's pax_list (with imported_from_proposal flag)
CREATE OR REPLACE FUNCTION public.convert_proposal_to_trip(
  p_proposal_id uuid,
  p_agency_id   uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_id    uuid;
  v_proposal   proposals%ROWTYPE;
  v_number     bigint;
  v_pax        jsonb;
  v_lead       leads%ROWTYPE;
BEGIN
  -- 1. Fetch proposal
  SELECT * INTO v_proposal
    FROM proposals
   WHERE id = p_proposal_id
     AND agency_id = p_agency_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta % não encontrada ou não pertence à agência.', p_proposal_id;
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
    v_proposal.lead_id,           -- ✅ Propagate lead_id for CRM funnel tracking
    v_proposal.client_id,
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
      v_proposal.client_id,
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
  END IF;

  -- 7. ✅ Create trip_passengers from lead's pax_list (if lead has pax_list populated)
  -- These are imported with a flag so the agent can review/edit before confirming
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
        'adult',  -- default, agent can change
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

-- ── 3. Trigger to recalculate trips.total_paid when installment is marked paid ──
CREATE OR REPLACE FUNCTION public.trg_recalculate_trip_total_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_total_paid numeric;
BEGIN
  -- Get the trip_id from the payment_plan
  SELECT pp.trip_id INTO v_trip_id
    FROM payment_plans pp
   WHERE pp.id = COALESCE(NEW.payment_plan_id, OLD.payment_plan_id);

  IF v_trip_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalculate total paid across all installments for this trip
  SELECT COALESCE(SUM(pi.amount), 0) INTO v_total_paid
    FROM payment_installments pi
    JOIN payment_plans pp ON pp.id = pi.payment_plan_id
   WHERE pp.trip_id = v_trip_id
     AND pi.status = 'paid'
     AND COALESCE(pi.is_third_party, false) = false;

  -- Update trips.total_paid
  UPDATE trips
     SET total_paid = v_total_paid
   WHERE id = v_trip_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_installment_paid_recalc ON public.payment_installments;
CREATE TRIGGER trg_installment_paid_recalc
AFTER INSERT OR UPDATE OF status ON public.payment_installments
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_trip_total_paid();

-- ── 4. Add notes column to trip_passengers if not exists (for imported flag) ──
ALTER TABLE public.trip_passengers
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS relationship text;

-- ── 5. Ensure trips.total_paid column exists ────────────────────────────────
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS total_paid numeric DEFAULT 0;

-- ── 6. Grant permissions ────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.trg_recalculate_trip_total_paid() TO authenticated;

COMMENT ON FUNCTION public.convert_proposal_to_trip IS
  'Converte atomicamente uma proposta aceita em Viagem. Propaga lead_id, cria trip_passengers a partir do pax_list do lead (marcados como importados para revisão).';

COMMENT ON FUNCTION public.trg_recalculate_trip_total_paid IS
  'Recalcula trips.total_paid automaticamente ao marcar parcelas como pagas.';
