create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.agency_id_by_slug(_slug text)
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select id from public.agencies where slug = _slug;
$$;