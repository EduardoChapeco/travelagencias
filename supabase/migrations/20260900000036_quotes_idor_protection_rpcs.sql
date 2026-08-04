-- =============================================================================
-- MICROFASE 4: Quotes IDOR Protection RPCs
-- =============================================================================

-- 1. Delete Quote Request (IDOR Protected)
CREATE OR REPLACE FUNCTION public.delete_quote_request_rpc(p_request_id uuid)
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

  SELECT agency_id INTO v_agency_id FROM public.quote_requests WHERE id = p_request_id;
  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Quote request not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.quote_requests
  WHERE id = p_request_id AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Update Quote Scenario Status (IDOR Protected)
CREATE OR REPLACE FUNCTION public.update_quote_scenario_status_rpc(p_scenario_id uuid, p_status text)
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

  SELECT qr.agency_id INTO v_agency_id 
  FROM public.quote_scenarios qs
  JOIN public.quote_search_plans qsp ON qs.search_plan_id = qsp.id
  JOIN public.quote_requests qr ON qsp.quote_request_id = qr.id
  WHERE qs.id = p_scenario_id;

  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Scenario not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.quote_scenarios
  SET status = p_status
  WHERE id = p_scenario_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Reject Package Candidate (IDOR Protected)
CREATE OR REPLACE FUNCTION public.reject_package_candidate_rpc(p_candidate_id uuid)
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

  SELECT qr.agency_id INTO v_agency_id 
  FROM public.package_candidates pc
  JOIN public.quote_requests qr ON pc.quote_request_id = qr.id
  WHERE pc.id = p_candidate_id;

  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Candidate not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.package_candidates
  SET status = 'invalid'
  WHERE id = p_candidate_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_quote_request_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_quote_scenario_status_rpc(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_package_candidate_rpc(uuid) TO authenticated;
