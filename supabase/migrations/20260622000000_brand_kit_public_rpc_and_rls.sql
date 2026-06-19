-- Migration: Update public agency RPCs and allow public read for brand_kit
-- Drop existing versions first to allow changing the return table type signature
DROP FUNCTION IF EXISTS public.get_public_agency_by_slug(text);
DROP FUNCTION IF EXISTS public.get_public_agency_by_id(uuid);

-- Redefine get_public_agency_by_slug to return expanded brand kit columns
CREATE OR REPLACE FUNCTION public.get_public_agency_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  brand_color text,
  brand_color_fg text,
  logo_white_url text,
  secondary_color text,
  accent_color text,
  font_heading text,
  font_body text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id, 
    a.name, 
    a.slug, 
    COALESCE(b.logo_url, a.logo_url) as logo_url, 
    COALESCE(b.primary_color, a.brand_color) as brand_color, 
    COALESCE(b.brand_color_fg, a.brand_color_fg) as brand_color_fg,
    b.logo_white_url,
    b.secondary_color,
    b.accent_color,
    b.font_heading,
    b.font_body
  FROM public.agencies a
  LEFT JOIN public.brand_kit b ON a.id = b.agency_id
  WHERE a.slug = _slug;
$$;

-- Redefine get_public_agency_by_id to return expanded brand kit columns
CREATE OR REPLACE FUNCTION public.get_public_agency_by_id(_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  brand_color text,
  brand_color_fg text,
  logo_white_url text,
  secondary_color text,
  accent_color text,
  font_heading text,
  font_body text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id, 
    a.name, 
    a.slug, 
    COALESCE(b.logo_url, a.logo_url) as logo_url, 
    COALESCE(b.primary_color, a.brand_color) as brand_color, 
    COALESCE(b.brand_color_fg, a.brand_color_fg) as brand_color_fg,
    b.logo_white_url,
    b.secondary_color,
    b.accent_color,
    b.font_heading,
    b.font_body
  FROM public.agencies a
  LEFT JOIN public.brand_kit b ON a.id = b.agency_id
  WHERE a.id = _id;
$$;

-- Ensure execute permissions are correctly granted
GRANT EXECUTE ON FUNCTION public.get_public_agency_by_slug(text) TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_agency_by_id(uuid) TO public, anon, authenticated;

-- Add RLS policy for public (anon and authenticated) select access to brand_kit
-- This allows visitor-facing pages (proposals, public portal pages) to retrieve styling variables
DROP POLICY IF EXISTS "brand public read" ON public.brand_kit;
CREATE POLICY "brand public read" ON public.brand_kit
  FOR SELECT TO anon, authenticated USING (true);
