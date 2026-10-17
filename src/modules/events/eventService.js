import { supabase } from "../../supabase/client";

export async function listEvents() {
  const { data, error } = await supabase.from("events").select("id, client_id, created_by, package_id, scheduled_at, status, sale_total, package_snapshot, location, locality, event_type, service_hours, travel_cost, route_distance_meters, route_duration_seconds, route_toll_amount, route_toll_currency, route_origin, details, clients(full_name, phone, email), payments(amount, paid_at), event_service_blocks(id, starts_at, service_hours, package_id, package_snapshot, notes, sort_order)").order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data.map((event) => {
    const payments = event.payments.map((payment) => ({ amount: Number(payment.amount), paidAt: payment.paid_at }));
    const historicalSeller = event.details?.match(/Vendedora histórica:\s*([^·]+)/i)?.[1]?.trim() ?? null;
    const serviceBlocks = event.event_service_blocks?.length
      ? event.event_service_blocks.map((block) => ({ id: block.id, startsAt: block.starts_at, time: new Date(block.starts_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }), serviceHours: block.service_hours == null ? null : Number(block.service_hours), packageId: block.package_id, packageName: block.package_snapshot?.name ?? "Servicio a definir", notes: block.notes, sortOrder: block.sort_order })).sort((a, b) => a.sortOrder - b.sortOrder)
      : [{ id: `legacy-${event.id}`, startsAt: event.scheduled_at, time: event.scheduled_at ? new Date(event.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "Sin hora", serviceHours: event.service_hours == null ? null : Number(event.service_hours), packageId: event.package_id, packageName: event.package_snapshot?.name ?? "Servicio a definir", notes: null, sortOrder: 0 }];
    return { id: event.id, clientId: event.client_id, packageId: event.package_id, createdBy: event.created_by, scheduledAt: event.scheduled_at, time: event.scheduled_at ? new Date(event.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "Sin hora", client: event.clients?.full_name ?? "Evento ocupado", phone: event.clients?.phone ?? null, email: event.clients?.email ?? null, packageName: event.package_snapshot?.name ?? "Servicio a definir", location: event.location, locality: event.locality, eventType: event.event_type, serviceHours: event.service_hours == null ? null : Number(event.service_hours), serviceBlocks, travelCost: event.travel_cost == null ? null : Number(event.travel_cost), routeDistanceMeters: event.route_distance_meters, routeDurationSeconds: event.route_duration_seconds, routeTollAmount: event.route_toll_amount == null ? null : Number(event.route_toll_amount), routeTollCurrency: event.route_toll_currency, routeOrigin: event.route_origin, details: event.details, historicalSeller, total: Number(event.sale_total), payments, paid: payments.reduce((sum, payment) => sum + payment.amount, 0), status: event.status };
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

export async function createEvent({ clientName, phone, email, location, locality, eventType, travelCost, route, details, serviceBlocks, total, date, userId }) {
  const { data: client, error: clientError } = await supabase.from("clients").insert({ full_name: clientName, phone: phone || null, email: email || null }).select("id").single();
  if (clientError) throw clientError;
  const primaryBlock = serviceBlocks[0];
  const scheduledAt = new Date(`${date}T${primaryBlock.time}:00`).toISOString();
  const reservationName = serviceBlocks.length === 1 ? primaryBlock.packageInfo?.name : `Reserva con ${serviceBlocks.length} servicios`;
  const { data: createdEvent, error } = await supabase.from("events").insert({ client_id: client.id, package_id: primaryBlock.packageInfo?.id ?? null, scheduled_at: scheduledAt, sale_total: total, location: location || null, locality: locality || null, event_type: eventType || null, service_hours: primaryBlock.serviceHours || null, travel_cost: travelCost, route_distance_meters: route?.distanceMeters ?? null, route_duration_seconds: route?.durationSeconds ?? null, route_toll_amount: route?.toll?.amount ?? null, route_toll_currency: route?.toll?.currency ?? null, route_origin: route?.origin ?? null, details: details || null, package_snapshot: { name: reservationName ?? "Servicio personalizado", base_price: total }, created_by: userId }).select("id").single();
  if (error) throw error;
  const { error: blocksError } = await supabase.from("event_service_blocks").insert(serviceBlocks.map((block, index) => ({ event_id: createdEvent.id, starts_at: new Date(`${date}T${block.time}:00`).toISOString(), service_hours: block.serviceHours || null, package_id: block.packageInfo?.id ?? null, package_snapshot: { name: block.packageInfo?.name ?? "Servicio personalizado", base_price: block.packageInfo?.base_price ?? 0 }, notes: block.notes || null, sort_order: index })));
  if (blocksError) throw blocksError;
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

export async function saveEventRoute(eventId, route) {
  const { error } = await supabase.from("events").update({
    route_distance_meters: route.distanceMeters ?? null,
    route_duration_seconds: route.durationSeconds ?? null,
    route_toll_amount: route.toll?.amount ?? null,
    route_toll_currency: route.toll?.currency ?? null,
    route_origin: route.origin ?? null,
  }).eq("id", eventId);
  if (error) throw error;
}

export async function updateReservation({ event, clientName, phone, email, location, locality, eventType, travelCost, details, total, date, serviceBlocks }) {
  const primary = serviceBlocks[0];
  const scheduledAt = new Date(`${date}T${primary.time}:00`).toISOString();
  const name = serviceBlocks.length === 1 ? primary.packageInfo?.name : `Reserva con ${serviceBlocks.length} servicios`;
  const { error: clientError } = await supabase.from("clients").update({ full_name: clientName, phone: phone || null, email: email || null }).eq("id", event.clientId);
  if (clientError) throw clientError;
  const locationChanged = location !== (event.location ?? "") || locality !== (event.locality ?? "");
  const { error } = await supabase.from("events").update({ package_id: primary.packageInfo?.id ?? null, scheduled_at: scheduledAt, sale_total: total, location: location || null, locality: locality || null, event_type: eventType || null, service_hours: primary.serviceHours || null, travel_cost: travelCost, details: details || null, package_snapshot: { name: name ?? "Servicio personalizado", base_price: total }, ...(locationChanged ? { route_distance_meters: null, route_duration_seconds: null, route_toll_amount: null, route_toll_currency: null, route_origin: null } : {}) }).eq("id", event.id);
  if (error) throw error;
  const { error: deleteError } = await supabase.from("event_service_blocks").delete().eq("event_id", event.id);
  if (deleteError) throw deleteError;
  const { error: blocksError } = await supabase.from("event_service_blocks").insert(serviceBlocks.map((block, index) => ({ event_id: event.id, starts_at: new Date(`${date}T${block.time}:00`).toISOString(), service_hours: block.serviceHours || null, package_id: block.packageInfo?.id ?? null, package_snapshot: { name: block.packageInfo?.name ?? "Servicio personalizado", base_price: block.packageInfo?.base_price ?? 0 }, notes: block.notes || null, sort_order: index })));
  if (blocksError) throw blocksError;
}
