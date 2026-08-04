-- =============================================================================
-- MICROFASE 2: Proposals IDOR Protection RPCs
-- =============================================================================

-- 1. Update Proposal (IDOR Protected)
CREATE OR REPLACE FUNCTION public.update_proposal_rpc(
  p_proposal_id uuid,
  p_patch       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_agency_id uuid;
  v_safe_patch jsonb;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM public.proposals
  WHERE id = p_proposal_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Remove system/immutable fields
  v_safe_patch := p_patch 
    - 'id' 
    - 'agency_id' 
    - 'created_at' 
    - 'deleted_at';

  UPDATE public.proposals
  SET
    title               = COALESCE((v_safe_patch->>'title'), title),
    status              = COALESCE((v_safe_patch->>'status'), status),
    destination         = CASE WHEN v_safe_patch ? 'destination' THEN v_safe_patch->>'destination' ELSE destination END,
    client_id           = CASE WHEN v_safe_patch ? 'client_id' THEN (v_safe_patch->>'client_id')::uuid ELSE client_id END,
    lead_id             = CASE WHEN v_safe_patch ? 'lead_id' THEN (v_safe_patch->>'lead_id')::uuid ELSE lead_id END,
    group_tour_id       = CASE WHEN v_safe_patch ? 'group_tour_id' THEN (v_safe_patch->>'group_tour_id')::uuid ELSE group_tour_id END,
    travel_start        = CASE WHEN v_safe_patch ? 'travel_start' THEN (v_safe_patch->>'travel_start')::date ELSE travel_start END,
    travel_end          = CASE WHEN v_safe_patch ? 'travel_end' THEN (v_safe_patch->>'travel_end')::date ELSE travel_end END,
    pax_adults          = CASE WHEN v_safe_patch ? 'pax_adults' THEN (v_safe_patch->>'pax_adults')::integer ELSE pax_adults END,
    pax_seniors         = CASE WHEN v_safe_patch ? 'pax_seniors' THEN (v_safe_patch->>'pax_seniors')::integer ELSE pax_seniors END,
    pax_children        = CASE WHEN v_safe_patch ? 'pax_children' THEN (v_safe_patch->>'pax_children')::integer ELSE pax_children END,
    pax_infants         = CASE WHEN v_safe_patch ? 'pax_infants' THEN (v_safe_patch->>'pax_infants')::integer ELSE pax_infants END,
    currency            = CASE WHEN v_safe_patch ? 'currency' THEN v_safe_patch->>'currency' ELSE currency END,
    valid_until         = CASE WHEN v_safe_patch ? 'valid_until' THEN (v_safe_patch->>'valid_until')::date ELSE valid_until END,
    notes               = CASE WHEN v_safe_patch ? 'notes' THEN v_safe_patch->>'notes' ELSE notes END,
    visibility          = CASE WHEN v_safe_patch ? 'visibility' THEN v_safe_patch->>'visibility' ELSE visibility END,
    owner_id            = CASE WHEN v_safe_patch ? 'owner_id' THEN (v_safe_patch->>'owner_id')::uuid ELSE owner_id END,
    flights             = CASE WHEN v_safe_patch ? 'flights' THEN v_safe_patch->'flights' ELSE flights END,
    hotels              = CASE WHEN v_safe_patch ? 'hotels' THEN v_safe_patch->'hotels' ELSE hotels END,
    transfers           = CASE WHEN v_safe_patch ? 'transfers' THEN v_safe_patch->'transfers' ELSE transfers END,
    tours               = CASE WHEN v_safe_patch ? 'tours' THEN v_safe_patch->'tours' ELSE tours END,
    itinerary           = CASE WHEN v_safe_patch ? 'itinerary' THEN v_safe_patch->'itinerary' ELSE itinerary END,
    includes            = CASE WHEN v_safe_patch ? 'includes' THEN v_safe_patch->'includes' ELSE includes END,
    excludes            = CASE WHEN v_safe_patch ? 'excludes' THEN v_safe_patch->'excludes' ELSE excludes END,
    emergency_contacts  = CASE WHEN v_safe_patch ? 'emergency_contacts' THEN v_safe_patch->'emergency_contacts' ELSE emergency_contacts END,
    insurance           = CASE WHEN v_safe_patch ? 'insurance' THEN v_safe_patch->'insurance' ELSE insurance END,
    discount_amount     = CASE WHEN v_safe_patch ? 'discount_amount' THEN (v_safe_patch->>'discount_amount')::numeric ELSE discount_amount END,
    markup_percentage   = CASE WHEN v_safe_patch ? 'markup_percentage' THEN (v_safe_patch->>'markup_percentage')::numeric ELSE markup_percentage END,
    total               = CASE WHEN v_safe_patch ? 'total' THEN (v_safe_patch->>'total')::numeric ELSE total END
  WHERE id = p_proposal_id
    AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true, 'proposal_id', p_proposal_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'update_proposal_rpc failed: %', SQLERRM;
END;
$$;

-- 2. Delete Proposal (Soft Delete)
CREATE OR REPLACE FUNCTION public.archive_proposal_rpc(p_proposal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_agency_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  SELECT agency_id INTO v_agency_id FROM public.proposals WHERE id = p_proposal_id;
  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Proposal not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.proposals
  SET deleted_at = NOW()
  WHERE id = p_proposal_id AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_proposal_rpc(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_proposal_rpc(uuid) TO authenticated;

COMMENT ON FUNCTION public.update_proposal_rpc IS 'IDOR-protected proposal update.';
