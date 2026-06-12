-- Add columns for onboarding and extended agency details
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

ALTER TABLE public.agency_private ADD COLUMN IF NOT EXISTS address_zip_code text;
ALTER TABLE public.agency_private ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE public.agency_private ADD COLUMN IF NOT EXISTS address_number text;
ALTER TABLE public.agency_private ADD COLUMN IF NOT EXISTS address_complement text;
ALTER TABLE public.agency_private ADD COLUMN IF NOT EXISTS address_neighborhood text;
ALTER TABLE public.agency_private ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE public.agency_private ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE public.agency_private ADD COLUMN IF NOT EXISTS address_country text;
ALTER TABLE public.agency_private ADD COLUMN IF NOT EXISTS business_hours jsonb;

-- Drop previous function to change signature safely if needed, or use CREATE OR REPLACE 
-- Since we are adding new parameters at the end, CREATE OR REPLACE might complain if we drop parameters,
-- but we are just adding new ones. To be safe, we drop it.
DROP FUNCTION IF EXISTS public.create_agency_onboarding(text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_agency_onboarding(
  _name text,
  _slug text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _full_name text DEFAULT NULL,
  _legal_name text DEFAULT NULL,
  _document text DEFAULT NULL,
  _address_zip_code text DEFAULT NULL,
  _address_street text DEFAULT NULL,
  _address_number text DEFAULT NULL,
  _address_complement text DEFAULT NULL,
  _address_neighborhood text DEFAULT NULL,
  _address_city text DEFAULT NULL,
  _address_state text DEFAULT NULL,
  _address_country text DEFAULT NULL,
  _business_hours jsonb DEFAULT NULL,
  _onboarding_completed boolean DEFAULT true
)
RETURNS TABLE(id uuid, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _agency_id uuid;
  _clean_slug text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  _clean_slug := lower(regexp_replace(trim(coalesce(_slug, '')), '[^a-z0-9-]+', '-', 'g'));
  _clean_slug := regexp_replace(_clean_slug, '(^-+|-+$)', '', 'g');

  IF length(trim(coalesce(_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Informe o nome da agência.';
  END IF;

  IF length(_clean_slug) < 3 THEN
    RAISE EXCEPTION 'Informe uma URL com pelo menos 3 caracteres.';
  END IF;

  SELECT coalesce(
    (SELECT p.default_agency_id FROM public.profiles p WHERE p.id = _user_id),
    (SELECT ur.agency_id FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.agency_id IS NOT NULL ORDER BY ur.created_at ASC LIMIT 1)
  )
  INTO _agency_id;

  IF _agency_id IS NULL THEN
    INSERT INTO public.agencies (name, slug, created_by, onboarding_completed)
    VALUES (trim(_name), _clean_slug, _user_id, _onboarding_completed)
    RETURNING agencies.id INTO _agency_id;
  ELSE
    UPDATE public.agencies a
    SET name = trim(_name),
        slug = CASE
          WHEN a.slug = _clean_slug THEN a.slug
          WHEN NOT EXISTS (SELECT 1 FROM public.agencies other WHERE other.slug = _clean_slug AND other.id <> a.id) THEN _clean_slug
          ELSE a.slug
        END,
        onboarding_completed = COALESCE(_onboarding_completed, a.onboarding_completed),
        updated_at = now()
    WHERE a.id = _agency_id;

    INSERT INTO public.user_roles (user_id, role, agency_id)
    VALUES (_user_id, 'agency_admin', _agency_id)
    ON CONFLICT (user_id, role, agency_id) DO NOTHING;
  END IF;

  INSERT INTO public.agency_private (
    agency_id, email, phone, legal_name, document,
    address_zip_code, address_street, address_number, address_complement, 
    address_neighborhood, address_city, address_state, address_country,
    business_hours
  )
  VALUES (
    _agency_id,
    nullif(trim(coalesce(_email, '')), ''),
    nullif(trim(coalesce(_phone, '')), ''),
    nullif(trim(coalesce(_legal_name, '')), ''),
    nullif(trim(coalesce(_document, '')), ''),
    nullif(trim(coalesce(_address_zip_code, '')), ''),
    nullif(trim(coalesce(_address_street, '')), ''),
    nullif(trim(coalesce(_address_number, '')), ''),
    nullif(trim(coalesce(_address_complement, '')), ''),
    nullif(trim(coalesce(_address_neighborhood, '')), ''),
    nullif(trim(coalesce(_address_city, '')), ''),
    nullif(trim(coalesce(_address_state, '')), ''),
    nullif(trim(coalesce(_address_country, '')), ''),
    _business_hours
  )
  ON CONFLICT (agency_id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, public.agency_private.email),
      phone = COALESCE(EXCLUDED.phone, public.agency_private.phone),
      legal_name = COALESCE(EXCLUDED.legal_name, public.agency_private.legal_name),
      document = COALESCE(EXCLUDED.document, public.agency_private.document),
      address_zip_code = COALESCE(EXCLUDED.address_zip_code, public.agency_private.address_zip_code),
      address_street = COALESCE(EXCLUDED.address_street, public.agency_private.address_street),
      address_number = COALESCE(EXCLUDED.address_number, public.agency_private.address_number),
      address_complement = COALESCE(EXCLUDED.address_complement, public.agency_private.address_complement),
      address_neighborhood = COALESCE(EXCLUDED.address_neighborhood, public.agency_private.address_neighborhood),
      address_city = COALESCE(EXCLUDED.address_city, public.agency_private.address_city),
      address_state = COALESCE(EXCLUDED.address_state, public.agency_private.address_state),
      address_country = COALESCE(EXCLUDED.address_country, public.agency_private.address_country),
      business_hours = COALESCE(EXCLUDED.business_hours, public.agency_private.business_hours),
      updated_at = now();

  INSERT INTO public.profiles (id, full_name, default_agency_id)
  VALUES (_user_id, nullif(trim(coalesce(_full_name, '')), ''), _agency_id)
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(nullif(trim(coalesce(_full_name, '')), ''), public.profiles.full_name),
      default_agency_id = _agency_id,
      updated_at = now();

  RETURN QUERY SELECT a.id, a.slug FROM public.agencies a WHERE a.id = _agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_agency_onboarding(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agency_onboarding(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, boolean) TO authenticated;
