-- Turis — Master Global Authority & RLS Fixes
-- Migration: 20260609000009_master_global_authority

-- =========================================================================
-- 1. CORREÇÃO DA AUTORIDADE GLOBAL DO SUPER ADMIN
-- =========================================================================
-- A função is_agency_member é o coração do RLS de quase todas as tabelas.
-- Atualmente ela ignora o super_admin. Vamos reescrevê-la para conceder
-- passe livre a super admins, resolvendo o "Fake Admin" em todo o banco.

CREATE OR REPLACE FUNCTION public.is_agency_member(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        (ur.agency_id = _agency_id AND ur.role IN ('agency_admin', 'agent'))
        OR (ur.role = 'super_admin') -- Bypass Global
      )
  );
$$;


-- =========================================================================
-- 2. CORREÇÃO DA POLICY ALUCINADA EM BOOKING_INSTALLMENTS
-- =========================================================================
-- A migration 20260609000001_booking_installments.sql criou uma policy 
-- consultando "public.users" que não existe.

DROP POLICY IF EXISTS "Super Admins access all installments" ON public.booking_installments;

CREATE POLICY "Super Admins access all installments" 
  ON public.booking_installments FOR ALL 
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));


-- =========================================================================
-- 3. FECHAMENTO DO VAZAMENTO DO PORTFÓLIO DE AGÊNCIAS
-- =========================================================================
-- A tabela agencies era "publicly readable", permitindo scraping total.
-- Vamos restringir o SELECT da tabela para Super Admins e Membros.

DROP POLICY IF EXISTS "agencies are publicly readable" ON public.agencies;

CREATE POLICY "agencies read restricted" 
  ON public.agencies FOR SELECT 
  TO authenticated
  USING (
    public.is_agency_member(auth.uid(), id)
  );

-- MAS para não quebrar portais públicos e links de clientes, 
-- criamos RPCs estritas que retornam apenas UMA agência sem permitir scraping de lista.

CREATE OR REPLACE FUNCTION public.get_public_agency_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  brand_color text,
  brand_color_fg text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, logo_url, brand_color, brand_color_fg
  FROM public.agencies
  WHERE slug = _slug;
$$;

CREATE OR REPLACE FUNCTION public.get_public_agency_by_id(_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  brand_color text,
  brand_color_fg text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, logo_url, brand_color, brand_color_fg
  FROM public.agencies
  WHERE id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_agency_by_slug(text) TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_agency_by_id(uuid) TO public, anon, authenticated;
