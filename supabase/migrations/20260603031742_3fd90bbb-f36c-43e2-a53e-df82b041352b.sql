
-- One-time bootstrap: first signup becomes global super_admin
create or replace function public.bootstrap_first_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only promote if there is no super_admin yet
  if not exists (select 1 from public.user_roles where role = 'super_admin') then
    insert into public.user_roles (user_id, role, agency_id)
    values (new.id, 'super_admin', null)
    on conflict do nothing;

    -- Self-destruct: remove trigger + function so this never fires again
    execute 'drop trigger if exists on_auth_user_bootstrap_super_admin on auth.users';
    execute 'drop function if exists public.bootstrap_first_super_admin() cascade';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_bootstrap_super_admin on auth.users;
create trigger on_auth_user_bootstrap_super_admin
after insert on auth.users
for each row execute function public.bootstrap_first_super_admin();
