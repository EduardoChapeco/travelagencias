-- Migration: portal_page_analytics
-- Description: Table for tracking clicks and views on public pages, protecting data reading with is_agency_member RLS check.

CREATE TABLE IF NOT EXISTS public.portal_page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.portal_pages(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  link_url TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.portal_page_analytics ENABLE ROW LEVEL SECURITY;

-- Table privileges
GRANT SELECT, INSERT ON public.portal_page_analytics TO authenticated;
GRANT INSERT ON public.portal_page_analytics TO anon;
GRANT ALL ON public.portal_page_analytics TO service_role;

-- Policies
CREATE POLICY "anyone can insert analytics events" ON public.portal_page_analytics
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "agency members can select analytics events" ON public.portal_page_analytics
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
