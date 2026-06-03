-- =========================================================================
-- TravelOS — Schema inicial multi-tenant
-- =========================================================================

-- ─── Helpers ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Agencies ────────────────────────────────────────────────────────────
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  legal_name text,
  document text,
  email text,
  phone text,
  brand_color text default '#1E293B',
  brand_color_light text default '#F1F5F9',
  brand_color_fg text default '#FFFFFF',
  logo_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agencies_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);
create trigger agencies_set_updated_at
  before update on public.agencies
  for each row execute function public.set_updated_at();

-- ─── Profiles (1:1 with auth.users) ──────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  default_agency_id uuid references public.agencies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Roles ───────────────────────────────────────────────────────────────
create type public.app_role as enum ('super_admin', 'agency_admin', 'agent', 'client');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  agency_id uuid references public.agencies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role, agency_id)
);
create index user_roles_user_idx on public.user_roles(user_id);
create index user_roles_agency_idx on public.user_roles(agency_id);

create or replace function public.has_role(
  _user_id uuid,
  _role public.app_role,
  _agency_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role = _role
      and (_agency_id is null or ur.agency_id = _agency_id)
  );
$$;

create or replace function public.is_agency_member(_user_id uuid, _agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.agency_id = _agency_id
      and ur.role in ('agency_admin', 'agent')
  );
$$;

-- Convenience: agency by slug (for routing)
create or replace function public.agency_id_by_slug(_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.agencies where slug = _slug;
$$;

-- When a new agency is created, the creator becomes its admin and gets default stages.
create or replace function public.handle_new_agency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.user_roles (user_id, role, agency_id)
    values (new.created_by, 'agency_admin', new.id)
    on conflict do nothing;
  end if;

  insert into public.lead_stages (agency_id, name, position, color, is_won, is_lost) values
    (new.id, 'Novo', 1, '#3B82F6', false, false),
    (new.id, 'Qualificado', 2, '#8B5CF6', false, false),
    (new.id, 'Proposta enviada', 3, '#F59E0B', false, false),
    (new.id, 'Negociação', 4, '#EAB308', false, false),
    (new.id, 'Fechado', 5, '#10B981', true, false),
    (new.id, 'Perdido', 6, '#EF4444', false, true);
  return new;
end;
$$;

-- ─── Lead Stages (Kanban columns) ────────────────────────────────────────
create table public.lead_stages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  position integer not null,
  color text not null default '#94A3B8',
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now(),
  unique (agency_id, position)
);
create index lead_stages_agency_idx on public.lead_stages(agency_id);

create trigger agencies_after_insert
  after insert on public.agencies
  for each row execute function public.handle_new_agency();

-- ─── Leads ───────────────────────────────────────────────────────────────
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  stage_id uuid not null references public.lead_stages(id) on delete restrict,
  owner_id uuid references auth.users(id) on delete set null,
  -- Contact
  name text not null,
  email text,
  phone text,
  -- Trip intent
  destination text,
  travel_start date,
  travel_end date,
  pax_count integer default 1 check (pax_count >= 0),
  estimated_value numeric(12,2) default 0 check (estimated_value >= 0),
  source text, -- 'instagram', 'whatsapp', 'site', 'indicação', etc.
  notes text,
  -- Kanban order within stage
  position integer not null default 0,
  -- Lifecycle
  closed_at timestamptz,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_agency_stage_idx on public.leads(agency_id, stage_id, position);
create index leads_owner_idx on public.leads(owner_id);
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ─── Lead Activities (timeline) ──────────────────────────────────────────
create type public.lead_activity_type as enum (
  'note', 'stage_change', 'call', 'email', 'whatsapp', 'meeting', 'task'
);

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  type public.lead_activity_type not null,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities(lead_id, created_at desc);

-- =========================================================================
-- GRANTS (Data API access)
-- =========================================================================
grant select, insert, update, delete on public.agencies     to authenticated;
grant select                          on public.agencies     to anon;
grant select, insert, update          on public.profiles     to authenticated;
grant select, insert, update, delete on public.user_roles   to authenticated;
grant select, insert, update, delete on public.lead_stages  to authenticated;
grant select, insert, update, delete on public.leads        to authenticated;
grant select, insert, update, delete on public.lead_activities to authenticated;

grant all on public.agencies, public.profiles, public.user_roles,
            public.lead_stages, public.leads, public.lead_activities
        to service_role;

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.agencies        enable row level security;
alter table public.profiles        enable row level security;
alter table public.user_roles      enable row level security;
alter table public.lead_stages     enable row level security;
alter table public.leads           enable row level security;
alter table public.lead_activities enable row level security;

-- agencies: anyone authenticated can create one (becomes admin via trigger);
-- public can read (portal público), members can update, admin can delete.
create policy "agencies are publicly readable"
  on public.agencies for select
  to anon, authenticated
  using (true);

create policy "authenticated users can create an agency"
  on public.agencies for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "agency members can update their agency"
  on public.agencies for update
  to authenticated
  using (public.is_agency_member(auth.uid(), id))
  with check (public.is_agency_member(auth.uid(), id));

create policy "agency admins can delete their agency"
  on public.agencies for delete
  to authenticated
  using (public.has_role(auth.uid(), 'agency_admin', id));

-- profiles: each user manages their own
create policy "users see their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- user_roles: a user can see their own roles; agency admins manage roles in their agency
create policy "users see their own roles"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy "agency admins see roles in their agency"
  on public.user_roles for select
  to authenticated
  using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));

create policy "agency admins manage roles in their agency"
  on public.user_roles for insert
  to authenticated
  with check (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));

create policy "agency admins update roles in their agency"
  on public.user_roles for update
  to authenticated
  using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));

create policy "agency admins delete roles in their agency"
  on public.user_roles for delete
  to authenticated
  using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));

-- lead_stages: visible/manageable by agency members
create policy "agency members read stages"
  on public.lead_stages for select
  to authenticated
  using (public.is_agency_member(auth.uid(), agency_id));

create policy "agency admins insert stages"
  on public.lead_stages for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'agency_admin', agency_id));

create policy "agency admins update stages"
  on public.lead_stages for update
  to authenticated
  using (public.has_role(auth.uid(), 'agency_admin', agency_id));

create policy "agency admins delete stages"
  on public.lead_stages for delete
  to authenticated
  using (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- leads: agency members can read/write all leads in their agency
create policy "agency members read leads"
  on public.leads for select
  to authenticated
  using (public.is_agency_member(auth.uid(), agency_id));

create policy "agency members create leads"
  on public.leads for insert
  to authenticated
  with check (public.is_agency_member(auth.uid(), agency_id));

create policy "agency members update leads"
  on public.leads for update
  to authenticated
  using (public.is_agency_member(auth.uid(), agency_id));

create policy "agency admins delete leads"
  on public.leads for delete
  to authenticated
  using (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- lead_activities: agency members can read/insert
create policy "agency members read activities"
  on public.lead_activities for select
  to authenticated
  using (public.is_agency_member(auth.uid(), agency_id));

create policy "agency members insert activities"
  on public.lead_activities for insert
  to authenticated
  with check (
    public.is_agency_member(auth.uid(), agency_id)
    and (author_id = auth.uid() or author_id is null)
  );

create policy "authors delete their activities"
  on public.lead_activities for delete
  to authenticated
  using (author_id = auth.uid());