CREATE TABLE public.desktop_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    color TEXT DEFAULT 'yellow',
    x_pos INTEGER NOT NULL DEFAULT 100,
    y_pos INTEGER NOT NULL DEFAULT 100,
    w_pos INTEGER NOT NULL DEFAULT 220,
    h_pos INTEGER NOT NULL DEFAULT 220,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.desktop_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view notes of their agency" ON public.desktop_notes
    FOR SELECT USING (
        auth.uid() = profile_id OR 
        public.is_agency_member(auth.uid(), agency_id)
    );

CREATE POLICY "Users can manage their own notes" ON public.desktop_notes
    FOR ALL USING (
        auth.uid() = profile_id
    );
