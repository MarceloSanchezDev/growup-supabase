-- Una reserva conserva su información comercial y de cobro en events.
-- Cada bloque representa un servicio/horario dentro de la misma fecha.
create table public.event_service_blocks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  starts_at timestamptz not null,
  service_hours numeric(6,2),
  package_id uuid references public.packages(id),
  package_snapshot jsonb not null default '{}'::jsonb,
  notes text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  check (service_hours is null or service_hours > 0)
);

create index idx_event_service_blocks_event_id on public.event_service_blocks(event_id);
create index idx_event_service_blocks_starts_at on public.event_service_blocks(starts_at);

alter table public.event_service_blocks enable row level security;

create policy "service blocks: owner or event creator reads"
on public.event_service_blocks for select to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (public.current_role() = 'owner' or e.created_by = auth.uid())
  )
);

create policy "service blocks: owner or event creator creates"
on public.event_service_blocks for insert to authenticated
with check (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (public.current_role() = 'owner' or e.created_by = auth.uid())
  )
);

create policy "service blocks: owner or event creator updates"
on public.event_service_blocks for update to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (public.current_role() = 'owner' or e.created_by = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (public.current_role() = 'owner' or e.created_by = auth.uid())
  )
);

create policy "service blocks: owner or event creator deletes"
on public.event_service_blocks for delete to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (public.current_role() = 'owner' or e.created_by = auth.uid())
  )
);

-- Evita cargar por error un bloque en una fecha diferente de la reserva.
create or replace function public.validate_service_block_date()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  reservation_date date;
begin
  select scheduled_at::date into reservation_date
  from public.events
  where id = new.event_id;

  if reservation_date is not null and new.starts_at::date <> reservation_date then
    raise exception 'Los servicios de una reserva deben realizarse el mismo día';
  end if;
  return new;
end;
$$;

create trigger validate_event_service_block_date
before insert or update on public.event_service_blocks
for each row execute function public.validate_service_block_date();
