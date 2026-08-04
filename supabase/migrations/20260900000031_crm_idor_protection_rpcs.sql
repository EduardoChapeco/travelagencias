-- =============================================================================
-- MICROFASE 2: CRM (Leads) IDOR Protection RPCs
-- =============================================================================

-- 1. Update Lead (IDOR Protected)
CREATE OR REPLACE FUNCTION public.update_lead_rpc(
  p_lead_id uuid,
  p_patch   jsonb
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

  -- Resolve actual agency from DB (preventing IDOR)
  SELECT agency_id INTO v_agency_id
  FROM public.leads
  WHERE id = p_lead_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of agency %', v_agency_id;
  END IF;

  -- Remove system/immutable fields
  v_safe_patch := p_patch 
    - 'id' 
    - 'agency_id' 
    - 'created_at' 
    - 'deleted_at';

  UPDATE public.leads
  SET
    stage_id           = COALESCE((v_safe_patch->>'stage_id')::uuid, stage_id),
    owner_id           = CASE WHEN v_safe_patch ? 'owner_id' THEN (v_safe_patch->>'owner_id')::uuid ELSE owner_id END,
    client_id          = CASE WHEN v_safe_patch ? 'client_id' THEN (v_safe_patch->>'client_id')::uuid ELSE client_id END,
    name               = COALESCE((v_safe_patch->>'name'), name),
    email              = CASE WHEN v_safe_patch ? 'email' THEN v_safe_patch->>'email' ELSE email END,
    phone              = CASE WHEN v_safe_patch ? 'phone' THEN v_safe_patch->>'phone' ELSE phone END,
    destination        = CASE WHEN v_safe_patch ? 'destination' THEN v_safe_patch->>'destination' ELSE destination END,
    estimated_value    = COALESCE((v_safe_patch->>'estimated_value')::numeric, estimated_value),
    pax_count          = COALESCE((v_safe_patch->>'pax_count')::integer, pax_count),
    source             = CASE WHEN v_safe_patch ? 'source' THEN v_safe_patch->>'source' ELSE source END,
    position           = COALESCE((v_safe_patch->>'position')::integer, position),
    notes              = CASE WHEN v_safe_patch ? 'notes' THEN v_safe_patch->>'notes' ELSE notes END,
    travel_start       = CASE WHEN v_safe_patch ? 'travel_start' THEN (v_safe_patch->>'travel_start')::date ELSE travel_start END,
    travel_end         = CASE WHEN v_safe_patch ? 'travel_end' THEN (v_safe_patch->>'travel_end')::date ELSE travel_end END,
    closed_at          = CASE WHEN v_safe_patch ? 'closed_at' THEN (v_safe_patch->>'closed_at')::timestamptz ELSE closed_at END,
    lost_reason        = CASE WHEN v_safe_patch ? 'lost_reason' THEN v_safe_patch->>'lost_reason' ELSE lost_reason END,
    pax_adults         = CASE WHEN v_safe_patch ? 'pax_adults' THEN (v_safe_patch->>'pax_adults')::integer ELSE pax_adults END,
    pax_children       = CASE WHEN v_safe_patch ? 'pax_children' THEN (v_safe_patch->>'pax_children')::integer ELSE pax_children END,
    pax_infants        = CASE WHEN v_safe_patch ? 'pax_infants' THEN (v_safe_patch->>'pax_infants')::integer ELSE pax_infants END,
    pax_ages           = CASE WHEN v_safe_patch ? 'pax_ages' THEN (SELECT array_agg(e::int) FROM jsonb_array_elements_text(v_safe_patch->'pax_ages') e) ELSE pax_ages END,
    custom_fields      = CASE WHEN v_safe_patch ? 'custom_fields' THEN v_safe_patch->'custom_fields' ELSE custom_fields END,
    tags               = CASE WHEN v_safe_patch ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(v_safe_patch->'tags')) ELSE tags END,
    attachments        = CASE WHEN v_safe_patch ? 'attachments' THEN v_safe_patch->'attachments' ELSE attachments END,
    avatar_url         = CASE WHEN v_safe_patch ? 'avatar_url' THEN v_safe_patch->>'avatar_url' ELSE avatar_url END,
    interest_type      = CASE WHEN v_safe_patch ? 'interest_type' THEN v_safe_patch->>'interest_type' ELSE interest_type END,
    lead_source_detail = CASE WHEN v_safe_patch ? 'lead_source_detail' THEN v_safe_patch->>'lead_source_detail' ELSE lead_source_detail END
  WHERE id = p_lead_id
    AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true, 'lead_id', p_lead_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'update_lead_rpc failed: %', SQLERRM;
END;
$$;

-- 2. Archive Lead (Soft Delete)
CREATE OR REPLACE FUNCTION public.archive_lead_rpc(p_lead_id uuid)
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

  SELECT agency_id INTO v_agency_id FROM public.leads WHERE id = p_lead_id;
  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.leads
  SET deleted_at = NOW()
  WHERE id = p_lead_id AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Restore Lead (Undo Soft Delete)
CREATE OR REPLACE FUNCTION public.restore_lead_rpc(p_lead_id uuid)
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

  SELECT agency_id INTO v_agency_id FROM public.leads WHERE id = p_lead_id;
  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.leads
  SET deleted_at = NULL
  WHERE id = p_lead_id AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Move Leads to Stage
CREATE OR REPLACE FUNCTION public.move_leads_stage_rpc(p_from_stage_id uuid, p_to_stage_id uuid)
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

  -- Resolve agency_id from the FROM stage
  SELECT agency_id INTO v_agency_id FROM public.lead_stages WHERE id = p_from_stage_id;
  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.leads
  SET stage_id = p_to_stage_id
  WHERE stage_id = p_from_stage_id AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_lead_rpc(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_lead_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_lead_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_leads_stage_rpc(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.update_lead_rpc IS 'IDOR-protected lead update. Microfase Fase 2';
