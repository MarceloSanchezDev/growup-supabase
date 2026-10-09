-- Datos internos de traslado. Los eventos existentes quedan sin costo ni ruta
-- para no asumir valores sobre el historial importado.
alter table public.events
  add column if not exists travel_cost numeric(12,2) check (travel_cost is null or travel_cost >= 0),
  add column if not exists route_distance_meters integer check (route_distance_meters is null or route_distance_meters >= 0),
  add column if not exists route_duration_seconds integer check (route_duration_seconds is null or route_duration_seconds >= 0),
  add column if not exists route_toll_amount numeric(12,2) check (route_toll_amount is null or route_toll_amount >= 0),
  add column if not exists route_toll_currency text,
  add column if not exists route_origin text;
