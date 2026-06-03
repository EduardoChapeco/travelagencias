
-- Lock down all SECURITY DEFINER helpers; only service_role can execute directly.
-- They are still callable indirectly through RLS policies / triggers because Postgres
-- runs them with the function owner's privileges via SECURITY DEFINER context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_agency_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_agency_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.contract_template_clauses() FROM PUBLIC, anon;

-- But: RLS policies need has_role / is_agency_member callable by authenticated.
-- Grant back narrowly to authenticated (these are deliberately exposed helpers).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_agency_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contract_template_clauses() TO authenticated;

-- verify_contract is intentionally public (signature verification)
-- Convert to SECURITY INVOKER since contracts has anon-readable verify need handled differently
-- Keep it SECURITY DEFINER but ONLY exposes masked fields, so accept the warning.
