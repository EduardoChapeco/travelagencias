-- P0-2: Fix schema mismatch — add is_published to portal_pages
-- The frontend uses `is_published` (boolean) but the initial migration created `status` (text)
-- This migration makes them consistent by adding is_published as a generated column

ALTER TABLE public.portal_pages
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN GENERATED ALWAYS AS (status = 'published') STORED;

-- Also drop the potentially conflicting anonymous SELECT policy and replace with correct one
DROP POLICY IF EXISTS "public can read published portal_pages" ON public.portal_pages;

CREATE POLICY "public can read published portal_pages" ON public.portal_pages
  FOR SELECT TO anon, authenticated USING (is_published = true OR status = 'published');

-- P0-3: Create missing RPCs for Portal Builder
-- RPC: publish_portal_page
CREATE OR REPLACE FUNCTION public.publish_portal_page(p_page_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id UUID;
BEGIN
  -- Fetch agency_id to validate permissions
  SELECT agency_id INTO v_agency_id FROM public.portal_pages WHERE id = p_page_id;
  
  -- Verify caller is a member of this agency
  IF NOT public.is_agency_member(auth.uid(), v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this agency';
  END IF;

  -- Set status to published and update published_at
  UPDATE public.portal_pages
  SET 
    status = 'published',
    published_at = NOW(),
    updated_at = NOW()
  WHERE id = p_page_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_portal_page(UUID) TO authenticated;

-- RPC: duplicate_portal_page
CREATE OR REPLACE FUNCTION public.duplicate_portal_page(p_page_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id UUID;
  v_new_id UUID;
  v_original RECORD;
  v_new_slug TEXT;
  v_suffix INT := 1;
BEGIN
  -- Fetch original page
  SELECT * INTO v_original FROM public.portal_pages WHERE id = p_page_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found: %', p_page_id;
  END IF;
  
  v_agency_id := v_original.agency_id;
  
  -- Verify caller is a member of this agency
  IF NOT public.is_agency_member(auth.uid(), v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this agency';
  END IF;

  -- Find a unique slug by appending -copy-N
  v_new_slug := v_original.slug || '-copia';
  WHILE EXISTS (SELECT 1 FROM public.portal_pages WHERE agency_id = v_agency_id AND slug = v_new_slug) LOOP
    v_suffix := v_suffix + 1;
    v_new_slug := v_original.slug || '-copia-' || v_suffix;
  END LOOP;

  -- Insert duplicate
  INSERT INTO public.portal_pages (
    agency_id, slug, title, description, cover_image_url, category,
    content, canvas_format, status
  )
  VALUES (
    v_agency_id,
    v_new_slug,
    v_original.title || ' (Cópia)',
    v_original.description,
    v_original.cover_image_url,
    v_original.category,
    v_original.content,
    v_original.canvas_format,
    'draft' -- always starts as draft
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_portal_page(UUID) TO authenticated;
