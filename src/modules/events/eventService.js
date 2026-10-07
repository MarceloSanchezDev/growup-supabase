import { supabase } from "../../supabase/client";

export async function listEvents() {
  const { data, error } = await supabase.from("events").select("id, created_by, scheduled_at, status, sale_total, package_snapshot, location, locality, event_type, service_hours, details, clients(full_name, phone, email), payments(amount, paid_at)").order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data.map((event) => {
    const payments = event.payments.map((payment) => ({ amount: Number(payment.amount), paidAt: payment.paid_at }));
    const historicalSeller = event.details?.match(/Vendedora histórica:\s*([^·]+)/i)?.[1]?.trim() ?? null;
    return { id: event.id, createdBy: event.created_by, scheduledAt: event.scheduled_at, time: event.scheduled_at ? new Date(event.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "Sin hora", client: event.clients?.full_name ?? "Sin cliente", phone: event.clients?.phone ?? null, email: event.clients?.email ?? null, packageName: event.package_snapshot?.name ?? "Servicio a definir", location: event.location, locality: event.locality, eventType: event.event_type, serviceHours: event.service_hours == null ? null : Number(event.service_hours), details: event.details, historicalSeller, total: Number(event.sale_total), payments, paid: payments.reduce((sum, payment) => sum + payment.amount, 0), status: event.status };
  });
}

export async function createEvent({ clientName, phone, email, location, locality, eventType, serviceHours, details, packageInfo, total, date, time, userId }) {
  const { data: client, error: clientError } = await supabase.from("clients").insert({ full_name: clientName, phone: phone || null, email: email || null }).select("id").single();
  if (clientError) throw clientError;
  const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
  const { error } = await supabase.from("events").insert({ client_id: client.id, package_id: packageInfo?.id ?? null, scheduled_at: scheduledAt, sale_total: total, location: location || null, locality: locality || null, event_type: eventType || null, service_hours: serviceHours || null, details: details || null, package_snapshot: { name: packageInfo?.name ?? "Servicio personalizado", base_price: packageInfo?.base_price ?? total }, created_by: userId });
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
