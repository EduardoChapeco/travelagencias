-- =============================================================================
-- Turis — CRM Scalability (Phase 7)
-- Migration: 20260609000008_crm_rpc
-- =============================================================================

-- Fetch active leads + a limited number of closed/lost leads to prevent browser crashes
CREATE OR REPLACE FUNCTION public.get_crm_leads(_agency_id uuid)
RETURNS SETOF public.leads
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Select all leads in active stages
  SELECT l.*
  FROM public.leads l
  JOIN public.lead_stages s ON s.id = l.stage_id
  WHERE l.agency_id = _agency_id
    AND s.is_won = false 
    AND s.is_lost = false

  UNION ALL

  -- Select top 50 recently updated won leads
  (SELECT l.*
  FROM public.leads l
  JOIN public.lead_stages s ON s.id = l.stage_id
  WHERE l.agency_id = _agency_id
    AND s.is_won = true
  ORDER BY l.created_at DESC
  LIMIT 50)

  UNION ALL

  -- Select top 50 recently updated lost leads
  (SELECT l.*
  FROM public.leads l
  JOIN public.lead_stages s ON s.id = l.stage_id
  WHERE l.agency_id = _agency_id
    AND s.is_lost = true
  ORDER BY l.created_at DESC
  LIMIT 50);
$$;
