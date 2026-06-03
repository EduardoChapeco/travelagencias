
create table if not exists public.agency_invites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  email text not null,
  role public.app_role not null default 'agent',
  invited_by uuid,
  token text not null default replace(gen_random_uuid()::text,'-',''),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  unique (agency_id, email)
);

grant select, insert, update, delete on public.agency_invites to authenticated;
grant all on public.agency_invites to service_role;
grant select on public.agency_invites to anon;

alter table public.agency_invites enable row level security;

create policy "invites read agency"
on public.agency_invites for select to authenticated
using (is_agency_member(auth.uid(), agency_id));

create policy "invites read by token"
on public.agency_invites for select to anon
using (true);

create policy "invites insert admin"
on public.agency_invites for insert to authenticated
with check (has_role(auth.uid(), 'agency_admin', agency_id));

create policy "invites delete admin"
on public.agency_invites for delete to authenticated
using (has_role(auth.uid(), 'agency_admin', agency_id));

create policy "invites accept self"
on public.agency_invites for update to authenticated
using (true)
with check (true);

create index if not exists agency_invites_token_idx on public.agency_invites(token);
create index if not exists agency_invites_email_idx on public.agency_invites(lower(email));

create or replace function public.accept_agency_invite(_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _invite public.agency_invites;
  _user_email text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select email into _user_email from auth.users where id = auth.uid();
  select * into _invite from public.agency_invites where token = _token;
  if _invite is null then raise exception 'Invite not found'; end if;
  if _invite.accepted_at is not null then return _invite.agency_id; end if;
  if _invite.expires_at < now() then raise exception 'Invite expired'; end if;
  if lower(_invite.email) <> lower(_user_email) then raise exception 'Email mismatch'; end if;

  insert into public.user_roles (user_id, role, agency_id)
  values (auth.uid(), _invite.role, _invite.agency_id)
  on conflict do nothing;

  update public.agency_invites set accepted_at = now() where id = _invite.id;
  update public.profiles set default_agency_id = coalesce(default_agency_id, _invite.agency_id) where id = auth.uid();
  return _invite.agency_id;
end; $$;

revoke execute on function public.accept_agency_invite(text) from public, anon;
grant execute on function public.accept_agency_invite(text) to authenticated;
