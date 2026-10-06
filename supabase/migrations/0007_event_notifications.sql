create type public.notification_type as enum ('event_confirmed', 'event_cancelled');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  type public.notification_type not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "notifications: recipients read own" on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy "notifications: recipients update own" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create or replace function public.notify_event_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status or new.status not in ('confirmed', 'cancelled') then return new; end if;
  insert into public.notifications (recipient_id, event_id, actor_id, type, message)
  select id, new.id, new.created_by,
    case when new.status = 'confirmed' then 'event_confirmed'::public.notification_type else 'event_cancelled'::public.notification_type end,
    case when new.status = 'confirmed' then 'Evento confirmado con seña registrada.' else 'Evento cancelado. Los pagos quedan registrados.' end
  from public.profiles where role = 'owner';
  return new;
end;
$$;

create trigger on_event_status_notification after update of status on public.events
for each row execute procedure public.notify_event_status_change();
