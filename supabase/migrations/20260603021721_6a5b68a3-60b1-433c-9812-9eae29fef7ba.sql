-- Lock down trigger-only functions: they run inside triggers as definer,
-- nobody should be able to call them directly.
revoke execute on function public.set_updated_at()            from public, anon, authenticated;
revoke execute on function public.handle_new_user()           from public, anon, authenticated;
revoke execute on function public.handle_new_agency()         from public, anon, authenticated;

-- Helpers used inside RLS WHERE clauses: keep execute for authenticated only
-- (policies evaluate as the calling role), revoke from anon.
revoke execute on function public.has_role(uuid, public.app_role, uuid) from public, anon;
revoke execute on function public.is_agency_member(uuid, uuid)          from public, anon;

-- agency_id_by_slug is convenient for the public portal; keep anon access.
-- (no revoke)