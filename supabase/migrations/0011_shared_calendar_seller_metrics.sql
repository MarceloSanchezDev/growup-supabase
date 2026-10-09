-- Agenda reducida para coordinación: las vendedoras ven bloques ocupados y
-- horarios de eventos ajenos, nunca clientes, importes, dirección o notas.
create or replace function public.shared_calendar_entries()
returns table (
  event_id uuid,
  scheduled_at timestamptz,
  status public.event_status,
  title text,
  service text,
  service_hours numeric,
  is_own boolean
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.scheduled_at,
    e.status,
    case when e.created_by = auth.uid() then c.full_name else 'Evento ocupado' end,
    case when e.created_by = auth.uid() then coalesce(e.package_snapshot ->> 'name', 'Servicio a definir') else 'Evento del equipo' end,
    case when e.created_by = auth.uid() then e.service_hours else null end,
    e.created_by = auth.uid()
  from public.events e
  join public.clients c on c.id = e.client_id
  where auth.uid() is not null
  order by e.scheduled_at;
$$;

revoke all on function public.shared_calendar_entries() from public;
grant execute on function public.shared_calendar_entries() to authenticated;
