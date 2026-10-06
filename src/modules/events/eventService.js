import { supabase } from "../../supabase/client";

export async function listEvents() {
  const { data, error } = await supabase.from("events").select("id, scheduled_at, status, sale_total, package_snapshot, clients(full_name), payments(amount, paid_at)").order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data.map((event) => ({ id: event.id, time: event.scheduled_at ? new Date(event.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "Sin hora", client: event.clients?.full_name ?? "Sin cliente", packageName: event.package_snapshot?.name ?? "Servicio a definir", total: Number(event.sale_total), paid: event.payments.reduce((sum, payment) => sum + Number(payment.amount), 0), status: event.status }));
}

export async function createEvent({ clientName, phone, email, location, locality, eventType, details, packageInfo, total, date, time, userId }) {
  const { data: client, error: clientError } = await supabase.from("clients").insert({ full_name: clientName, phone: phone || null, email: email || null }).select("id").single();
  if (clientError) throw clientError;
  const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
  const { error } = await supabase.from("events").insert({ client_id: client.id, package_id: packageInfo?.id ?? null, scheduled_at: scheduledAt, sale_total: total, location: location || null, locality: locality || null, event_type: eventType || null, details: details || null, package_snapshot: { name: packageInfo?.name ?? "Servicio personalizado", base_price: packageInfo?.base_price ?? total }, created_by: userId });
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
