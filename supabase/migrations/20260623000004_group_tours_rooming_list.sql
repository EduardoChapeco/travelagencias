-- Fase 9: Add rooming_list JSONB column to group_tours
-- Stores room distribution data inline on the group tour record
-- Format: [{ id, room_number, room_type, hotel_name, checkin_date, checkout_date, notes, is_confirmed, passengers: [{passenger_id, name}] }]

alter table public.group_tours
  add column if not exists rooming_list jsonb not null default '[]'::jsonb;

comment on column public.group_tours.rooming_list is
  'JSONB array of room entries for Rooming List management. Each entry contains room details and allocated passenger list.';
