import { supabase } from "../../supabase/client";

function scheduledAt(date, timeRange) {
  const match = String(timeRange ?? "").match(/(\d{1,2})(?:[:.](\d{2}))?/);
  if (!match) return null;
  const hour = String(Math.min(Number(match[1]), 23)).padStart(2, "0");
  const minute = String(Math.min(Number(match[2] ?? 0), 59)).padStart(2, "0");
  return new Date(`${date}T${hour}:${minute}:00`).toISOString();
}

export async function importHistoricalEvents(rows, userId) {
  const { data: existing, error: sourceError } = await supabase.from("events").select("legacy_source").not("legacy_source", "is", null);
  if (sourceError) throw sourceError;
  const importedSources = new Set(existing.map((event) => event.legacy_source));
  const pendingRows = rows.filter((row) => !importedSources.has(`${row.source.sheet}:${row.source.row}`));
  if (!pendingRows.length) return { events: 0, payments: 0, skipped: rows.length };
  const clients = pendingRows.map((row) => ({ full_name: row.clientName, phone: row.phone || null }));
  const { data: createdClients, error: clientError } = await supabase.from("clients").insert(clients).select("id");
  if (clientError) throw clientError;

  const events = pendingRows.map((row, index) => ({
    client_id: createdClients[index].id,
    scheduled_at: scheduledAt(row.date, row.timeRange),
    status: row.cancelled ? "cancelled" : "pending_deposit",
    sale_total: row.saleTotal,
    location: row.location,
    locality: row.locality,
    event_type: row.eventType,
    details: [row.details, row.timeRange && `Horario original: ${row.timeRange}`, row.seller && `Vendedora histórica: ${row.seller}`, `Origen: ${row.source.sheet}, fila ${row.source.row}`].filter(Boolean).join(" · "),
    legacy_source: `${row.source.sheet}:${row.source.row}`,
    package_snapshot: { name: row.service || "Servicio histórico", base_price: row.saleTotal },
    created_by: userId,
  }));
  const { data: createdEvents, error: eventError } = await supabase.from("events").insert(events).select("id");
  if (eventError) throw eventError;

  const payments = pendingRows.flatMap((row, index) => row.deposit > 0 ? [{ event_id: createdEvents[index].id, amount: row.deposit, note: "Seña importada desde Excel 2026", created_by: userId }] : []);
  if (payments.length) {
    const { error: paymentError } = await supabase.from("payments").insert(payments);
    if (paymentError) throw paymentError;
  }
  return { events: createdEvents.length, payments: payments.length, skipped: rows.length - pendingRows.length };
}
