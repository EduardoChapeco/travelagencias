-- Add sharing and visibility columns to public.desktop_notes
ALTER TABLE public.desktop_notes 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'assigned')),
ADD COLUMN IF NOT EXISTS assigned_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Recreate RLS Policies
DROP POLICY IF EXISTS "Users can view notes of their agency" ON public.desktop_notes;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.desktop_notes;

-- SELECT policy: Owner, members (if public), or assignee (if assigned)
CREATE POLICY "Users can view notes based on visibility" ON public.desktop_notes
    FOR SELECT USING (
        auth.uid() = profile_id OR 
        (visibility = 'public' AND public.is_agency_member(auth.uid(), agency_id)) OR
        (visibility = 'assigned' AND auth.uid() = assigned_profile_id)
    );

-- ALL policy: Only creator can update or delete
CREATE POLICY "Users can manage their own notes" ON public.desktop_notes
    FOR ALL USING (
        auth.uid() = profile_id
    );
