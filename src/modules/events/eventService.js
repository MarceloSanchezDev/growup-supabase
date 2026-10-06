import { supabase } from "../../supabase/client";

export async function listEvents() {
  const { data, error } = await supabase.from("events").select("id, scheduled_at, status, sale_total, package_snapshot, clients(full_name), payments(amount)").order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data.map((event) => ({ id: event.id, time: event.scheduled_at ? new Date(event.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "Sin hora", client: event.clients?.full_name ?? "Sin cliente", packageName: event.package_snapshot?.name ?? "Servicio a definir", total: Number(event.sale_total), paid: event.payments.reduce((sum, payment) => sum + Number(payment.amount), 0), status: event.status }));
}

export async function createEvent({ clientName, packageName, total, date, time, userId }) {
  const { data: client, error: clientError } = await supabase.from("clients").insert({ full_name: clientName }).select("id").single();
  if (clientError) throw clientError;
  const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
  const { error } = await supabase.from("events").insert({ client_id: client.id, scheduled_at: scheduledAt, sale_total: total, package_snapshot: { name: packageName }, created_by: userId });
  if (error) throw error;
}
