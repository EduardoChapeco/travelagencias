CREATE OR REPLACE FUNCTION public.create_agency_onboarding(
  _name text,
  _slug text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _full_name text DEFAULT NULL,
  _legal_name text DEFAULT NULL,
  _document text DEFAULT NULL
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
    INSERT INTO public.agencies (name, slug, created_by)
    VALUES (trim(_name), _clean_slug, _user_id)
    RETURNING agencies.id INTO _agency_id;
  ELSE
    UPDATE public.agencies a
    SET name = trim(_name),
        slug = CASE
          WHEN a.slug = _clean_slug THEN a.slug
          WHEN NOT EXISTS (SELECT 1 FROM public.agencies other WHERE other.slug = _clean_slug AND other.id <> a.id) THEN _clean_slug
          ELSE a.slug
        END,
        updated_at = now()
    WHERE a.id = _agency_id;

    INSERT INTO public.user_roles (user_id, role, agency_id)
    VALUES (_user_id, 'agency_admin', _agency_id)
    ON CONFLICT (user_id, role, agency_id) DO NOTHING;
  END IF;

  INSERT INTO public.agency_private (agency_id, email, phone, legal_name, document)
  VALUES (
    _agency_id,
    nullif(trim(coalesce(_email, '')), ''),
    nullif(trim(coalesce(_phone, '')), ''),
    nullif(trim(coalesce(_legal_name, '')), ''),
    nullif(trim(coalesce(_document, '')), '')
  )
  ON CONFLICT (agency_id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, public.agency_private.email),
      phone = COALESCE(EXCLUDED.phone, public.agency_private.phone),
      legal_name = COALESCE(EXCLUDED.legal_name, public.agency_private.legal_name),
      document = COALESCE(EXCLUDED.document, public.agency_private.document),
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

REVOKE ALL ON FUNCTION public.create_agency_onboarding(text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agency_onboarding(text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_agency_id() TO authenticated;