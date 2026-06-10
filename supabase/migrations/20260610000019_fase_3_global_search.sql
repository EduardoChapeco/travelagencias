-- ==============================================================================
-- FASE 3: GLOBAL SEARCH RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.global_search(p_agency_id uuid, p_term text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results json;
  v_term_wildcard text;
BEGIN
  -- Verify access
  IF NOT is_agency_member(p_agency_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_term_wildcard := '%' || p_term || '%';

  WITH clients_cte AS (
    SELECT id, full_name as title, 'client' as type, email as subtitle 
    FROM clients 
    WHERE agency_id = p_agency_id 
      AND deleted_at IS NULL
      AND (full_name ILIKE v_term_wildcard OR email ILIKE v_term_wildcard OR document ILIKE v_term_wildcard)
    LIMIT 5
  ),
  leads_cte AS (
    SELECT id, title, 'lead' as type, status as subtitle 
    FROM leads 
    WHERE agency_id = p_agency_id 
      AND deleted_at IS NULL
      AND (title ILIKE v_term_wildcard)
    LIMIT 5
  ),
  trips_cte AS (
    SELECT id, title, 'trip' as type, number as subtitle 
    FROM trips 
    WHERE agency_id = p_agency_id 
      AND deleted_at IS NULL
      AND (title ILIKE v_term_wildcard OR number ILIKE v_term_wildcard)
    LIMIT 5
  ),
  tickets_cte AS (
    SELECT id, title, 'ticket' as type, code as subtitle
    FROM support_tickets
    WHERE agency_id = p_agency_id
      AND (title ILIKE v_term_wildcard OR code ILIKE v_term_wildcard)
    LIMIT 5
  ),
  combined AS (
    SELECT * FROM clients_cte
    UNION ALL
    SELECT * FROM leads_cte
    UNION ALL
    SELECT * FROM trips_cte
    UNION ALL
    SELECT * FROM tickets_cte
  )
  SELECT COALESCE(json_agg(row_to_json(combined)), '[]'::json) INTO v_results FROM combined;

  RETURN v_results;
END;
$$;
