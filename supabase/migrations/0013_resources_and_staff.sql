create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  available_quantity integer not null default 1 check (available_quantity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.event_resource_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  service_block_id uuid references public.event_service_blocks(id) on delete cascade,
  resource_id uuid not null references public.resources(id),
  quantity integer not null default 1 check (quantity > 0)
);

create table public.event_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  service_block_id uuid references public.event_service_blocks(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id)
);

alter table public.resources enable row level security;
alter table public.staff_members enable row level security;
alter table public.event_resource_assignments enable row level security;
alter table public.event_staff_assignments enable row level security;

create policy "resources: authenticated users read active"
on public.resources for select to authenticated using (active or public.current_role() = 'owner');
create policy "resources: owners manage"
on public.resources for all to authenticated using (public.current_role() = 'owner') with check (public.current_role() = 'owner');
create policy "staff: authenticated users read active"
on public.staff_members for select to authenticated using (active or public.current_role() = 'owner');
create policy "staff: owners manage"
on public.staff_members for all to authenticated using (public.current_role() = 'owner') with check (public.current_role() = 'owner');
create policy "resource assignments: owner or event creator manages"
on public.event_resource_assignments for all to authenticated
using (exists (select 1 from public.events e where e.id = event_id and (public.current_role() = 'owner' or e.created_by = auth.uid())))
with check (exists (select 1 from public.events e where e.id = event_id and (public.current_role() = 'owner' or e.created_by = auth.uid())));
create policy "staff assignments: owner or event creator manages"
on public.event_staff_assignments for all to authenticated
using (exists (select 1 from public.events e where e.id = event_id and (public.current_role() = 'owner' or e.created_by = auth.uid())))
with check (exists (select 1 from public.events e where e.id = event_id and (public.current_role() = 'owner' or e.created_by = auth.uid())));
