
-- =========================================================================
-- Enums
-- =========================================================================
create type public.client_kind as enum ('individual', 'company');
create type public.supplier_kind as enum ('airline','hotel','operator','insurance','transfer','car_rental','cruise','activity','visa','other');
create type public.proposal_status as enum ('draft','sent','viewed','accepted','rejected','expired','converted');
create type public.proposal_item_kind as enum ('flight','hotel','transfer','tour','insurance','car_rental','cruise','visa','fee','discount','other');
create type public.trip_status as enum ('planning','confirmed','in_progress','completed','cancelled');
create type public.passenger_kind as enum ('adult','child','infant');

-- =========================================================================
-- clients
-- =========================================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  kind public.client_kind not null default 'individual',
  full_name text not null,
  legal_name text,
  document text,
  email text,
  phone text,
  birth_date date,
  nationality text,
  address jsonb not null default '{}'::jsonb,
  notes text,
  tags text[] not null default '{}',
  user_id uuid,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_agency_idx on public.clients(agency_id);
create index clients_user_idx on public.clients(user_id) where user_id is not null;
create unique index clients_agency_document_uidx
  on public.clients(agency_id, document) where document is not null;

grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;

create policy "agency members read clients" on public.clients
  for select to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency members create clients" on public.clients
  for insert to authenticated with check (is_agency_member(auth.uid(), agency_id));
create policy "agency members update clients" on public.clients
  for update to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency admins delete clients" on public.clients
  for delete to authenticated using (has_role(auth.uid(), 'agency_admin', agency_id));
create policy "clients see their own record" on public.clients
  for select to authenticated using (user_id = auth.uid());

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- =========================================================================
-- suppliers
-- =========================================================================
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  kind public.supplier_kind not null default 'other',
  name text not null,
  legal_name text,
  document text,
  email text,
  phone text,
  website text,
  contact_name text,
  commission_rate numeric(5,2) not null default 0,
  payment_terms text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suppliers_agency_idx on public.suppliers(agency_id);

grant select, insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;

create policy "agency members read suppliers" on public.suppliers
  for select to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency members create suppliers" on public.suppliers
  for insert to authenticated with check (is_agency_member(auth.uid(), agency_id));
create policy "agency members update suppliers" on public.suppliers
  for update to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency admins delete suppliers" on public.suppliers
  for delete to authenticated using (has_role(auth.uid(), 'agency_admin', agency_id));

create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- =========================================================================
-- proposals
-- =========================================================================
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  number serial not null,
  title text not null,
  status public.proposal_status not null default 'draft',
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  owner_id uuid,
  destination text,
  travel_start date,
  travel_end date,
  pax_adults int not null default 1,
  pax_children int not null default 0,
  pax_infants int not null default 0,
  currency text not null default 'BRL',
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  valid_until date,
  notes text,
  terms text,
  public_token text not null default replace(gen_random_uuid()::text,'-',''),
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proposals_agency_idx on public.proposals(agency_id);
create index proposals_lead_idx on public.proposals(lead_id);
create index proposals_client_idx on public.proposals(client_id);
create unique index proposals_token_uidx on public.proposals(public_token);

grant select, insert, update, delete on public.proposals to authenticated;
grant all on public.proposals to service_role;
alter table public.proposals enable row level security;

create policy "agency members read proposals" on public.proposals
  for select to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency members create proposals" on public.proposals
  for insert to authenticated with check (is_agency_member(auth.uid(), agency_id));
create policy "agency members update proposals" on public.proposals
  for update to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency admins delete proposals" on public.proposals
  for delete to authenticated using (has_role(auth.uid(), 'agency_admin', agency_id));

create trigger proposals_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

-- =========================================================================
-- proposal_items
-- =========================================================================
create table public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  kind public.proposal_item_kind not null default 'other',
  supplier_id uuid references public.suppliers(id) on delete set null,
  title text not null,
  description text,
  start_date date,
  end_date date,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  cost_price numeric(14,2) not null default 0,
  total numeric(14,2) generated always as (quantity * unit_price) stored,
  position int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index proposal_items_proposal_idx on public.proposal_items(proposal_id);
create index proposal_items_agency_idx on public.proposal_items(agency_id);

grant select, insert, update, delete on public.proposal_items to authenticated;
grant all on public.proposal_items to service_role;
alter table public.proposal_items enable row level security;

create policy "agency members read proposal_items" on public.proposal_items
  for select to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency members manage proposal_items insert" on public.proposal_items
  for insert to authenticated with check (is_agency_member(auth.uid(), agency_id));
create policy "agency members manage proposal_items update" on public.proposal_items
  for update to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency members delete proposal_items" on public.proposal_items
  for delete to authenticated using (is_agency_member(auth.uid(), agency_id));

-- =========================================================================
-- trips
-- =========================================================================
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  number serial not null,
  code text,
  title text not null,
  status public.trip_status not null default 'planning',
  client_id uuid references public.clients(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  owner_id uuid,
  destination text,
  travel_start date,
  travel_end date,
  currency text not null default 'BRL',
  total_sale numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_agency_idx on public.trips(agency_id);
create index trips_client_idx on public.trips(client_id);

grant select, insert, update, delete on public.trips to authenticated;
grant all on public.trips to service_role;
alter table public.trips enable row level security;

create policy "agency members read trips" on public.trips
  for select to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency members create trips" on public.trips
  for insert to authenticated with check (is_agency_member(auth.uid(), agency_id));
create policy "agency members update trips" on public.trips
  for update to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency admins delete trips" on public.trips
  for delete to authenticated using (has_role(auth.uid(), 'agency_admin', agency_id));

create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- =========================================================================
-- trip_passengers
-- =========================================================================
create table public.trip_passengers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  kind public.passenger_kind not null default 'adult',
  full_name text not null,
  document text,
  document_type text,
  birth_date date,
  nationality text,
  email text,
  phone text,
  is_lead_passenger boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index trip_passengers_trip_idx on public.trip_passengers(trip_id);
create index trip_passengers_agency_idx on public.trip_passengers(agency_id);

grant select, insert, update, delete on public.trip_passengers to authenticated;
grant all on public.trip_passengers to service_role;
alter table public.trip_passengers enable row level security;

create policy "agency members read passengers" on public.trip_passengers
  for select to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency members create passengers" on public.trip_passengers
  for insert to authenticated with check (is_agency_member(auth.uid(), agency_id));
create policy "agency members update passengers" on public.trip_passengers
  for update to authenticated using (is_agency_member(auth.uid(), agency_id));
create policy "agency members delete passengers" on public.trip_passengers
  for delete to authenticated using (is_agency_member(auth.uid(), agency_id));

-- =========================================================================
-- leads conversion link
-- =========================================================================
alter table public.leads
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists converted_at timestamptz;
create index if not exists leads_client_idx on public.leads(client_id);
