alter table public.events add column cancelled_reason text;

create or replace function public.cancel_event(p_event_id uuid, p_reason text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.events
    where id = p_event_id and (public.current_role() = 'owner' or created_by = auth.uid())
  ) then raise exception 'Not authorized to cancel this event'; end if;

  update public.events
  set status = 'cancelled', cancelled_at = now(), cancelled_reason = nullif(trim(p_reason), '')
  where id = p_event_id and status not in ('completed', 'cancelled');
end;
$$;

create or replace function public.reschedule_event(p_event_id uuid, p_scheduled_at timestamptz)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare new_event_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_scheduled_at is null then raise exception 'A new date and time are required'; end if;
  if not exists (
    select 1 from public.events
    where id = p_event_id and (public.current_role() = 'owner' or created_by = auth.uid())
  ) then raise exception 'Not authorized to reschedule this event'; end if;

  insert into public.events (client_id, package_id, scheduled_at, status, sale_total, package_snapshot, created_by, rescheduled_from_id)
  select client_id, package_id, p_scheduled_at, 'pending_deposit', sale_total, package_snapshot, auth.uid(), id
  from public.events where id = p_event_id
  returning id into new_event_id;

  update public.payments set event_id = new_event_id where event_id = p_event_id;
  update public.events set status = 'rescheduled' where id = p_event_id;
  return new_event_id;
end;
$$;

grant execute on function public.cancel_event(uuid, text) to authenticated;
grant execute on function public.reschedule_event(uuid, timestamptz) to authenticated;
