create type public.app_role as enum ('owner', 'seller', 'viewer');
create type public.event_status as enum ('pending_deposit', 'confirmed', 'cancelled', 'rescheduled', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'seller',
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_price numeric(12,2) not null check (base_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  package_id uuid references public.packages(id),
  scheduled_at timestamptz,
  status public.event_status not null default 'pending_deposit',
  sale_total numeric(12,2) not null check (sale_total >= 0),
  package_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  rescheduled_from_id uuid references public.events(id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  note text,
  created_by uuid references public.profiles(id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  incurred_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index idx_events_scheduled_at on public.events(scheduled_at);
create index idx_payments_event_id on public.payments(event_id);
create index idx_expenses_event_id on public.expenses(event_id);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.packages enable row level security;
alter table public.events enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

-- Las políticas definitivas se aplicarán junto con el flujo de invitaciones y el rol inicial del dueño/a.
