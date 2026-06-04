GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_agency_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_agency_id() FROM anon;