import { supabase } from "../../supabase/client";

export async function listEvents() {
  const { data, error } = await supabase.from("events").select("id, created_by, scheduled_at, status, sale_total, package_snapshot, location, locality, event_type, service_hours, travel_cost, route_distance_meters, route_duration_seconds, route_toll_amount, route_toll_currency, route_origin, details, clients(full_name, phone, email), payments(amount, paid_at)").order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data.map((event) => {
    const payments = event.payments.map((payment) => ({ amount: Number(payment.amount), paidAt: payment.paid_at }));
    const historicalSeller = event.details?.match(/Vendedora histórica:\s*([^·]+)/i)?.[1]?.trim() ?? null;
    return { id: event.id, createdBy: event.created_by, scheduledAt: event.scheduled_at, time: event.scheduled_at ? new Date(event.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "Sin hora", client: event.clients?.full_name ?? "Evento ocupado", phone: event.clients?.phone ?? null, email: event.clients?.email ?? null, packageName: event.package_snapshot?.name ?? "Servicio a definir", location: event.location, locality: event.locality, eventType: event.event_type, serviceHours: event.service_hours == null ? null : Number(event.service_hours), travelCost: event.travel_cost == null ? null : Number(event.travel_cost), routeDistanceMeters: event.route_distance_meters, routeDurationSeconds: event.route_duration_seconds, routeTollAmount: event.route_toll_amount == null ? null : Number(event.route_toll_amount), routeTollCurrency: event.route_toll_currency, routeOrigin: event.route_origin, details: event.details, historicalSeller, total: Number(event.sale_total), payments, paid: payments.reduce((sum, payment) => sum + payment.amount, 0), status: event.status };
  });
}

export async function listSharedCalendarEvents() {
  const { data, error } = await supabase.rpc("shared_calendar_entries");
  if (error) throw error;
  return data.map((event) => ({
    id: event.event_id,
    scheduledAt: event.scheduled_at,
    time: event.scheduled_at ? new Date(event.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "Sin hora",
    client: event.title,
    packageName: event.service,
    serviceHours: event.service_hours == null ? null : Number(event.service_hours),
    status: event.status,
    isOwn: event.is_own,
  }));
}

export async function createEvent({ clientName, phone, email, location, locality, eventType, serviceHours, travelCost, route, details, packageInfo, total, date, time, userId }) {
  const { data: client, error: clientError } = await supabase.from("clients").insert({ full_name: clientName, phone: phone || null, email: email || null }).select("id").single();
  if (clientError) throw clientError;
  const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
  const { error } = await supabase.from("events").insert({ client_id: client.id, package_id: packageInfo?.id ?? null, scheduled_at: scheduledAt, sale_total: total, location: location || null, locality: locality || null, event_type: eventType || null, service_hours: serviceHours || null, travel_cost: travelCost, route_distance_meters: route?.distanceMeters ?? null, route_duration_seconds: route?.durationSeconds ?? null, route_toll_amount: route?.toll?.amount ?? null, route_toll_currency: route?.toll?.currency ?? null, route_origin: route?.origin ?? null, details: details || null, package_snapshot: { name: packageInfo?.name ?? "Servicio personalizado", base_price: packageInfo?.base_price ?? total }, created_by: userId });
  if (error) throw error;
}

export async function addPayment({ eventId, amount, note, userId }) {
  const { error } = await supabase.from("payments").insert({
    event_id: eventId,
    amount,
    note: note || null,
    created_by: userId,
  });
  if (error) throw error;
}

export async function cancelEvent(eventId, reason) {
  const { error } = await supabase.rpc("cancel_event", { p_event_id: eventId, p_reason: reason || null });
  if (error) throw error;
}

export async function rescheduleEvent(eventId, date, time) {
  const { error } = await supabase.rpc("reschedule_event", {
    p_event_id: eventId,
    p_scheduled_at: new Date(`${date}T${time}:00`).toISOString(),
  });
  if (error) throw error;
}
