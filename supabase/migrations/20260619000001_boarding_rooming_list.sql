-- Fase 9: Rooming List para excursões de grupo
-- Tabela para gerenciar distribuição de quartos em grupos

create table if not exists public.boarding_rooming_list (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  card_id uuid not null references public.boarding_cards(id) on delete cascade,
  room_number text not null,
  room_type text not null default 'double' check (room_type in ('single','double','triple','quad','suite')),
  hotel_name text,
  checkin_date date,
  checkout_date date,
  passengers jsonb not null default '[]'::jsonb,
  -- ex: [{ "name": "João Silva", "passenger_id": "uuid", "document": "123", "meal_plan": "BB" }]
  notes text,
  is_confirmed boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index de busca por card (embarque)
create index if not exists rooming_list_card_idx on public.boarding_rooming_list(card_id);
create index if not exists rooming_list_agency_idx on public.boarding_rooming_list(agency_id);

-- Updated_at trigger
create or replace trigger rooming_list_updated_at
  before update on public.boarding_rooming_list
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.boarding_rooming_list enable row level security;

create policy "rooming read" on public.boarding_rooming_list
  for select to authenticated
  using (public.is_agency_member(auth.uid(), agency_id));

create policy "rooming insert" on public.boarding_rooming_list
  for insert to authenticated
  with check (public.is_agency_member(auth.uid(), agency_id));

create policy "rooming update" on public.boarding_rooming_list
  for update to authenticated
  using (public.is_agency_member(auth.uid(), agency_id));

create policy "rooming delete" on public.boarding_rooming_list
  for delete to authenticated
  using (public.has_role(auth.uid(), 'super_admin'::public.app_role) or public.is_agency_member(auth.uid(), agency_id));

-- Grants
grant select, insert, update, delete on public.boarding_rooming_list to authenticated;
grant all on public.boarding_rooming_list to service_role;
