CREATE OR REPLACE FUNCTION public.handle_new_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, agency_id)
    VALUES (NEW.created_by, 'agency_admin', NEW.id)
    ON CONFLICT (user_id, role, agency_id) DO NOTHING;

    INSERT INTO public.profiles (id, default_agency_id)
    VALUES (NEW.created_by, NEW.id)
    ON CONFLICT (id) DO UPDATE
    SET default_agency_id = COALESCE(public.profiles.default_agency_id, EXCLUDED.default_agency_id),
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_agency_created_assign_admin'
  ) THEN
    CREATE TRIGGER on_agency_created_assign_admin
    AFTER INSERT ON public.agencies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_agency();
  END IF;
END $$;

INSERT INTO public.user_roles (user_id, role, agency_id)
SELECT a.created_by, 'agency_admin', a.id
FROM public.agencies a
WHERE a.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = a.created_by
      AND ur.agency_id = a.id
      AND ur.role = 'agency_admin'
  )
ON CONFLICT (user_id, role, agency_id) DO NOTHING;

UPDATE public.profiles p
SET default_agency_id = a.id,
    updated_at = now()
FROM public.agencies a
WHERE p.id = a.created_by
  AND p.default_agency_id IS NULL;

REVOKE EXECUTE ON FUNCTION public.handle_new_agency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_agency_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pick_active_api_key(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trip_created_make_boarding() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.accept_agency_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_with_token(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_contract_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_passenger_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_payment_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_passenger_with_token(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract_with_token(text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_contract(text) TO anon, authenticated;