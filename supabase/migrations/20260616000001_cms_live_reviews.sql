-- Create agency reviews table for live testimonials block
CREATE TABLE IF NOT EXISTS public.agency_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT,
  review_text TEXT NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public reviews are readable by everyone" ON public.agency_reviews
  FOR SELECT TO anon, authenticated USING (status = 'approved');

CREATE POLICY "Agency members can manage reviews of their agency" ON public.agency_reviews
  FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- Grant permissions
GRANT SELECT ON public.agency_reviews TO anon, authenticated;
GRANT ALL ON public.agency_reviews TO service_role;
