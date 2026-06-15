-- Allow public insert to agency_reviews with status forced to 'pending'
CREATE POLICY "Anyone can submit a pending review" ON public.agency_reviews
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');

-- Grant insert permission to anon and authenticated
GRANT INSERT ON public.agency_reviews TO anon, authenticated;
