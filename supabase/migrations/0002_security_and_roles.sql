-- Authentication and authorization for GrowUp.
-- The first authenticated user can claim the owner role once; later users
-- are sellers by default and must be promoted by an owner.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'seller'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.claim_first_owner()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if exists (select 1 from public.profiles where role = 'owner') then
    raise exception 'An owner already exists';
  end if;
  update public.profiles set role = 'owner' where id = auth.uid();
end;
$$;

grant execute on function public.claim_first_owner() to authenticated;

create policy "profiles: read own profile or owner reads all"
on public.profiles for select to authenticated
using (id = auth.uid() or public.current_role() = 'owner');

create policy "profiles: owner updates team roles"
on public.profiles for update to authenticated
using (public.current_role() = 'owner')
with check (public.current_role() = 'owner');

create policy "clients: authenticated users can read"
on public.clients for select to authenticated using (true);

create policy "clients: sellers and owners can create"
on public.clients for insert to authenticated
with check (public.current_role() in ('owner', 'seller'));

create policy "clients: sellers and owners can update"
on public.clients for update to authenticated
using (public.current_role() in ('owner', 'seller'))
with check (public.current_role() in ('owner', 'seller'));

create policy "packages: authenticated users can read"
on public.packages for select to authenticated using (true);

create policy "packages: only owners can manage"
on public.packages for all to authenticated
using (public.current_role() = 'owner')
with check (public.current_role() = 'owner');

create policy "events: authenticated users can read"
on public.events for select to authenticated using (true);

create policy "events: sellers and owners can create"
on public.events for insert to authenticated
with check (
  public.current_role() in ('owner', 'seller')
  and created_by = auth.uid()
);

create policy "events: owners or the creator can update"
on public.events for update to authenticated
using (public.current_role() = 'owner' or created_by = auth.uid())
with check (public.current_role() = 'owner' or created_by = auth.uid());

create policy "payments: authenticated users can read"
on public.payments for select to authenticated using (true);

create policy "payments: sellers and owners can create"
on public.payments for insert to authenticated
with check (
  public.current_role() in ('owner', 'seller')
  and created_by = auth.uid()
);

create policy "payments: only owners can change past payments"
on public.payments for update to authenticated
using (public.current_role() = 'owner')
with check (public.current_role() = 'owner');

create policy "expenses: only owners can read and manage"
on public.expenses for all to authenticated
using (public.current_role() = 'owner')
with check (public.current_role() = 'owner');
