-- Migration: 20260900000000_task_activity_logs_and_fixes.sql
-- Purpose: 
--   1. Create task_activity_logs table for full audit trail
--   2. Fix support_tickets RLS and query corrections

-- ─── 1. TASK ACTIVITY LOGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_changed', 'priority_changed', 'assigned', 'moved', 'completed', 'reopened', 'deleted', 'commented', 'checklist_updated')),
  old_value   JSONB,
  new_value   JSONB,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON public.task_activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_agency_id ON public.task_activity_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created_at ON public.task_activity_logs(created_at DESC);

ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_activity_select" ON public.task_activity_logs FOR SELECT USING (
  public.is_agency_member(auth.uid(), agency_id)
);

CREATE POLICY "task_activity_insert" ON public.task_activity_logs FOR INSERT WITH CHECK (
  public.is_agency_member(auth.uid(), agency_id)
);

-- Grant
GRANT SELECT, INSERT ON public.task_activity_logs TO authenticated;

-- ─── 2. SUPPORT TICKETS — Fix assignee join column name ───────────────────
-- The support_tickets table uses 'assignee_id' (FK to auth.users),
-- not the old 'agency_members' join. Update any stale references.

-- Verify that assignee_id exists (added in 20260615000006)
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── 3. SUPPORT TICKETS — Add refund_requested boolean ───────────────────
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS refund_requested BOOL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none'
    CHECK (refund_status IN ('none', 'pending_airline', 'approved', 'paid'));

-- ─── 4. TASK COMMENTS — Fix RLS for reading user metadata ─────────────────
-- task_comments uses 'user_id' joining to auth.users, 
-- but we read via profiles table for display names
DROP POLICY IF EXISTS "task_comments_select" ON public.task_comments;
CREATE POLICY "task_comments_select" ON public.task_comments FOR SELECT USING (
  public.is_agency_member(auth.uid(), agency_id) AND is_deleted = false
);

DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;
CREATE POLICY "task_comments_insert" ON public.task_comments FOR INSERT WITH CHECK (
  public.is_agency_member(auth.uid(), agency_id) AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;
CREATE POLICY "task_comments_update" ON public.task_comments FOR UPDATE USING (
  user_id = auth.uid()
);

GRANT SELECT, INSERT, UPDATE ON public.task_comments TO authenticated;

-- ─── 5. TASK CHECKLIST ITEMS — Fix RLS ────────────────────────────────────
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_select" ON public.task_checklist_items;
CREATE POLICY "checklist_select" ON public.task_checklist_items FOR SELECT USING (
  public.is_agency_member(auth.uid(), agency_id)
);

DROP POLICY IF EXISTS "checklist_insert" ON public.task_checklist_items;
CREATE POLICY "checklist_insert" ON public.task_checklist_items FOR INSERT WITH CHECK (
  public.is_agency_member(auth.uid(), agency_id)
);

DROP POLICY IF EXISTS "checklist_update" ON public.task_checklist_items;
CREATE POLICY "checklist_update" ON public.task_checklist_items FOR UPDATE USING (
  public.is_agency_member(auth.uid(), agency_id)
);

DROP POLICY IF EXISTS "checklist_delete" ON public.task_checklist_items;
CREATE POLICY "checklist_delete" ON public.task_checklist_items FOR DELETE USING (
  public.is_agency_member(auth.uid(), agency_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_checklist_items TO authenticated;
