
-- Allow agency members to view each other's profile (needed for Team list and Lead owner display)
CREATE POLICY "agency members read teammate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles me
    JOIN public.user_roles them
      ON them.agency_id = me.agency_id
    WHERE me.user_id = auth.uid()
      AND them.user_id = public.profiles.id
      AND me.agency_id IS NOT NULL
  )
);

-- Allow activity authors to edit their own activity content
CREATE POLICY "authors update their activities"
ON public.lead_activities
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());
