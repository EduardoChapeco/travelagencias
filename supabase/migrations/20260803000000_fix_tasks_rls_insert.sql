-- Migration: 20260803000000_fix_tasks_rls_insert
-- Objective: Make sure task creations are fully permitted for agency members and super admins

DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_agency_member(auth.uid(), agency_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND agency_id = tasks.agency_id
    )
  )
);
