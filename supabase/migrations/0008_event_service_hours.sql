-- Duración estimada del servicio para los eventos que se cobran o planifican por hora.
alter table public.events
  add column if not exists service_hours numeric(5,2)
  check (service_hours is null or service_hours > 0);
