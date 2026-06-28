-- Migration: 20260805000000_fix_tasks_rls_recursion.sql
-- Objective: Break RLS circular dependency recursion between tasks and task_watchers

-- 1. Helper function to check task watchers using SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_task_watcher(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_watchers
    WHERE task_id = _task_id AND user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_task_watcher(uuid, uuid) TO authenticated, service_role;

-- 2. Helper function to get task agency using SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_task_agency(_task_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT agency_id FROM public.tasks WHERE id = _task_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_task_agency(uuid) TO authenticated, service_role;

-- 3. Recreate public.tasks SELECT policy using the new bypass function
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (
  public.is_agency_member(auth.uid(), agency_id) AND is_deleted = false AND (
    public.has_role(auth.uid(), 'agency_admin', agency_id) OR
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    public.is_task_watcher(id, auth.uid())
  )
);

-- 4. Recreate public.task_watchers policies using the new bypass function
DROP POLICY IF EXISTS "watchers_select" ON public.task_watchers;
DROP POLICY IF EXISTS "watchers_insert" ON public.task_watchers;
DROP POLICY IF EXISTS "watchers_delete" ON public.task_watchers;

CREATE POLICY "watchers_select" ON public.task_watchers FOR SELECT USING (
  public.is_agency_member(auth.uid(), public.get_task_agency(task_id))
);

CREATE POLICY "watchers_insert" ON public.task_watchers FOR INSERT WITH CHECK (
  public.is_agency_member(auth.uid(), public.get_task_agency(task_id))
);

CREATE POLICY "watchers_delete" ON public.task_watchers FOR DELETE USING (
  public.is_agency_member(auth.uid(), public.get_task_agency(task_id))
);
