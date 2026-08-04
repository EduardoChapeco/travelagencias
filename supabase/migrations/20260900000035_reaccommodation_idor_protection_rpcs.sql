-- =============================================================================
-- MICROFASE 3: Reaccommodation IDOR Protection RPCs
-- =============================================================================

-- 1. Update Reaccommodation (IDOR Protected)
CREATE OR REPLACE FUNCTION public.update_reaccommodation_rpc(
  p_request_id uuid,
  p_patch      jsonb
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
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  SELECT agency_id INTO v_agency_id
  FROM public.reaccommodation_requests
  WHERE id = p_request_id;

  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Reaccommodation request not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_safe_patch := p_patch 
    - 'id' 
    - 'agency_id' 
    - 'trip_id' 
    - 'created_at';

  UPDATE public.reaccommodation_requests
  SET
    status               = CASE WHEN v_safe_patch ? 'status' THEN (v_safe_patch->>'status')::text ELSE status::text END::varchar,
    workflow_status      = CASE WHEN v_safe_patch ? 'workflow_status' THEN (v_safe_patch->>'workflow_status')::text ELSE workflow_status::text END::varchar,
    affected_flights     = CASE WHEN v_safe_patch ? 'affected_flights' THEN v_safe_patch->'affected_flights' ELSE affected_flights END,
    passengers           = CASE WHEN v_safe_patch ? 'passengers' THEN v_safe_patch->'passengers' ELSE passengers END,
    options              = CASE WHEN v_safe_patch ? 'options' THEN v_safe_patch->'options' ELSE options END,
    analysis_results     = CASE WHEN v_safe_patch ? 'analysis_results' THEN v_safe_patch->'analysis_results' ELSE analysis_results END,
    original_ticket_data = CASE WHEN v_safe_patch ? 'original_ticket_data' THEN v_safe_patch->'original_ticket_data' ELSE original_ticket_data END,
    source               = CASE WHEN v_safe_patch ? 'source' THEN (v_safe_patch->>'source')::text ELSE source::text END::varchar,
    error_log            = CASE WHEN v_safe_patch ? 'error_log' THEN v_safe_patch->'error_log' ELSE error_log END,
    updated_at           = NOW()
  WHERE id = p_request_id
    AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Archive Reaccommodation (Soft Delete)
CREATE OR REPLACE FUNCTION public.archive_reaccommodation_rpc(p_request_id uuid)
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

  SELECT agency_id INTO v_agency_id FROM public.reaccommodation_requests WHERE id = p_request_id;
  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Reaccommodation request not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.reaccommodation_requests
  SET status = 'archived', updated_at = NOW()
  WHERE id = p_request_id AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_reaccommodation_rpc(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_reaccommodation_rpc(uuid) TO authenticated;
