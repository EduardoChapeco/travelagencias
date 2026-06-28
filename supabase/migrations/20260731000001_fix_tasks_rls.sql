-- Enforce RLS on task_label_assignments
ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies can view their own task label assignments"
    ON public.task_label_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_label_assignments.task_id
            AND tasks.agency_id = public.get_my_agency_id()
        )
    );

CREATE POLICY "Agencies can insert their own task label assignments"
    ON public.task_label_assignments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_label_assignments.task_id
            AND tasks.agency_id = public.get_my_agency_id()
        )
    );

CREATE POLICY "Agencies can delete their own task label assignments"
    ON public.task_label_assignments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_label_assignments.task_id
            AND tasks.agency_id = public.get_my_agency_id()
        )
    );

-- Enforce RLS on task_activity_log
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies can view their own task activity logs"
    ON public.task_activity_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_activity_log.task_id
            AND tasks.agency_id = public.get_my_agency_id()
        )
    );

CREATE POLICY "Agencies can insert their own task activity logs"
    ON public.task_activity_log
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_activity_log.task_id
            AND tasks.agency_id = public.get_my_agency_id()
        )
    );
