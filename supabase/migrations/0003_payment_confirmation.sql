-- A reservation becomes confirmed when recorded payments reach 10% of the sale.
-- Cancelled, rescheduled and completed events keep their operational status.
create or replace function public.sync_event_confirmation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  affected_event_id uuid;
  sale_amount numeric(12,2);
  paid_amount numeric(12,2);
begin
  affected_event_id := coalesce(new.event_id, old.event_id);

  select sale_total into sale_amount from public.events where id = affected_event_id;
  select coalesce(sum(amount), 0) into paid_amount from public.payments where event_id = affected_event_id;

  update public.events
  set status = case when paid_amount >= sale_amount * 0.10 then 'confirmed'::public.event_status else 'pending_deposit'::public.event_status end
  where id = affected_event_id and status in ('pending_deposit', 'confirmed');

  return coalesce(new, old);
end;
$$;

create trigger payments_update_event_confirmation
after insert or update or delete on public.payments
for each row execute procedure public.sync_event_confirmation();

create policy "payments: only owners can delete"
on public.payments for delete to authenticated
using (public.current_role() = 'owner');
