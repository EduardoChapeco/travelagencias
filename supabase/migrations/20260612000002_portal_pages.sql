CREATE TABLE IF NOT EXISTS public.portal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category TEXT DEFAULT 'roteiro', -- roteiro|passeio|guia|destino
  content JSONB DEFAULT '[]'::jsonb, -- blocos de conteúdo: {type, data}
  canvas_format TEXT DEFAULT 'web-page',
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, slug)
);

-- RLS
ALTER TABLE public.portal_pages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_pages TO authenticated;
GRANT SELECT ON public.portal_pages TO anon;
GRANT ALL ON public.portal_pages TO service_role;

CREATE POLICY "agency members read portal_pages" ON public.portal_pages
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency members create portal_pages" ON public.portal_pages
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency members update portal_pages" ON public.portal_pages
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency members delete portal_pages" ON public.portal_pages
  FOR DELETE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "public can read published portal_pages" ON public.portal_pages
  FOR SELECT TO anon, authenticated USING (status = 'published');

CREATE TRIGGER portal_pages_updated_at
  BEFORE UPDATE ON public.portal_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
