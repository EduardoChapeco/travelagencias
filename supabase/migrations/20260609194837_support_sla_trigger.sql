-- Trigger to calculate SLA deadline automatically for support tickets

create or replace function public.calculate_sla_deadline()
returns trigger language plpgsql as $$
begin
  if new.priority = 'urgent' then
    new.sla_deadline := new.created_at + interval '4 hours';
  elsif new.priority = 'high' then
    new.sla_deadline := new.created_at + interval '12 hours';
  elsif new.priority = 'medium' then
    new.sla_deadline := new.created_at + interval '24 hours';
  elsif new.priority = 'low' then
    new.sla_deadline := new.created_at + interval '48 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists set_sla_deadline on public.support_tickets;

create trigger set_sla_deadline
  before insert or update of priority on public.support_tickets
  for each row
  execute function public.calculate_sla_deadline();
