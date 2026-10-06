-- Campos que hoy se registran en la planilla operativa de GrowUp.
alter table public.events
  add column if not exists location text,
  add column if not exists locality text,
  add column if not exists event_type text,
  add column if not exists details text;
