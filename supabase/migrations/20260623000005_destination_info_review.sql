-- Add reviewed_at and reviewed_by columns to destination_info
alter table public.destination_info
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id);

comment on column public.destination_info.reviewed_at is 'Timestamp when the destination info was reviewed by an agent/admin.';
comment on column public.destination_info.reviewed_by is 'User ID of the agent/admin who reviewed the destination info.';
