-- Las vendedoras solo pueden consultar los eventos que ellas mismas cargaron,
-- junto con sus clientes y pagos. La dueña mantiene acceso total.
drop policy if exists "events: authenticated users can read" on public.events;
create policy "events: owner or creator reads own events"
on public.events for select to authenticated
using (public.current_role() = 'owner' or created_by = auth.uid());

drop policy if exists "clients: authenticated users can read" on public.clients;
create policy "clients: owner or event creator reads"
on public.clients for select to authenticated
using (
  public.current_role() = 'owner'
  or exists (select 1 from public.events where events.client_id = clients.id and events.created_by = auth.uid())
);

drop policy if exists "payments: authenticated users can read" on public.payments;
create policy "payments: owner or event creator reads"
on public.payments for select to authenticated
using (
  public.current_role() = 'owner'
  or exists (select 1 from public.events where events.id = payments.event_id and events.created_by = auth.uid())
);
