-- ============================================================
-- P0: REAL DAILY DIGEST AND CALENDAR EVENTS
-- ============================================================

-- 1. Create missing calendar_events table to support meetings
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  participants_count INT DEFAULT 1,
  location TEXT,
  is_video_call BOOLEAN DEFAULT false,
  meet_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_agency ON public.calendar_events(agency_id, start_time);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_select" ON public.calendar_events FOR SELECT USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "calendar_insert" ON public.calendar_events FOR INSERT WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "calendar_update" ON public.calendar_events FOR UPDATE USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "calendar_delete" ON public.calendar_events FOR DELETE USING (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- 2. Update the RPC to use the real tables
CREATE OR REPLACE FUNCTION public.get_daily_digest(
  p_user_id   UUID,
  p_agency_id UUID,
  p_date      DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'date', p_date,
    'tasks_today', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.due_time NULLS LAST, t.priority), '[]'::jsonb)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
        AND t.due_date = p_date
        AND t.is_deleted = false
        AND t.status != 'done'
    ),
    'overdue_tasks', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.due_date), '[]'::jsonb)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
        AND t.due_date < p_date
        AND t.is_deleted = false
        AND t.status NOT IN ('done', 'cancelled')
    ),
    'upcoming_deadlines', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.due_date), '[]'::jsonb)
      FROM public.tasks t
      WHERE t.agency_id = p_agency_id
        AND (t.assigned_to = p_user_id OR t.created_by = p_user_id)
        AND t.due_date BETWEEN p_date + 1 AND p_date + 3
        AND t.is_deleted = false
        AND t.status NOT IN ('done', 'cancelled')
    ),
    'agenda_events', (
      SELECT COALESCE(jsonb_agg(e ORDER BY e.start_time), '[]'::jsonb)
      FROM public.calendar_events e
      WHERE e.agency_id = p_agency_id
        AND DATE(e.start_time AT TIME ZONE 'UTC') = p_date
    ),
    'embarques_today', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', tr.id,
        'source_type', 'embarque',
        'source_url', '/agency/' || a.slug || '/trips/' || tr.id || '/boarding',
        'title', tr.title,
        'travel_start', tr.travel_start,
        'status', tr.status
      ) ORDER BY tr.travel_start), '[]'::jsonb)
      FROM public.trips tr
      JOIN public.agencies a ON a.id = tr.agency_id
      WHERE tr.agency_id = p_agency_id
        AND tr.travel_start = p_date
        AND tr.status != 'cancelled'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
