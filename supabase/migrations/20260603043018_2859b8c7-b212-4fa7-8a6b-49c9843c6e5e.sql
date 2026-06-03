CREATE OR REPLACE FUNCTION public.create_agency_onboarding(
  _name text,
  _slug text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _full_name text DEFAULT NULL
)
RETURNS TABLE(id uuid, slug text)
LANGUAGE plpgsql
SECURITY INVOKER
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

  INSERT INTO public.agencies (name, slug, created_by)
  VALUES (trim(_name), _clean_slug, _user_id)
  RETURNING agencies.id INTO _agency_id;

  INSERT INTO public.agency_private (agency_id, email, phone)
  VALUES (_agency_id, nullif(trim(coalesce(_email, '')), ''), nullif(trim(coalesce(_phone, '')), ''))
  ON CONFLICT (agency_id) DO UPDATE
  SET email = EXCLUDED.email,
      phone = EXCLUDED.phone,
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

REVOKE ALL ON FUNCTION public.create_agency_onboarding(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agency_onboarding(text, text, text, text, text) TO authenticated;