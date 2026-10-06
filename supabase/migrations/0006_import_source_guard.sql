-- Cada fila importada del Excel queda identificada para impedir duplicados.
alter table public.events add column if not exists legacy_source text;
create unique index if not exists events_legacy_source_unique
  on public.events (legacy_source)
  where legacy_source is not null;
