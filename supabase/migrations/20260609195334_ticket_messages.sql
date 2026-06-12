create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender text not null check (sender in ('agency', 'client', 'system')),
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ticket_messages enable row level security;
grant select, insert, update, delete on public.ticket_messages to authenticated;
grant all on public.ticket_messages to service_role;

create policy "ticket_messages_agency_select" on public.ticket_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.support_tickets st
      where st.id = ticket_messages.ticket_id and public.is_agency_member(auth.uid(), st.agency_id)
    )
  );

create policy "ticket_messages_agency_insert" on public.ticket_messages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.support_tickets st
      where st.id = ticket_messages.ticket_id and public.is_agency_member(auth.uid(), st.agency_id)
    )
  );

-- Data Migration Strategy: extract old JSONB arrays to new relational table
do $$
declare
  t record;
  m jsonb;
begin
  -- Only run if messages column exists
  if exists (select 1 from information_schema.columns where table_name = 'support_tickets' and column_name = 'messages') then
    for t in execute 'select id, messages from public.support_tickets where messages is not null and jsonb_array_length(messages) > 0' loop
      for m in select * from jsonb_array_elements(t.messages) loop
        insert into public.ticket_messages (ticket_id, sender, content, created_at)
        values (
          t.id, 
          COALESCE(m->>'sender', 'agency'), 
          COALESCE(m->>'content', ''), 
          COALESCE((m->>'created_at')::timestamptz, now())
        );
      end loop;
    end loop;
    
    -- Drop the legacy jsonb column
    execute 'alter table public.support_tickets drop column messages';
  end if;
end;
$$;
