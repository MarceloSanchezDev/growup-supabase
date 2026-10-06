import { eventStatusLabel } from "./demoEvents";

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function downloadEventsCsv(events) {
  const header = ["Cliente", "Fecha y hora", "Servicio", "Total", "Cobrado", "Saldo", "Estado"];
  const rows = events.map((event) => [event.client, event.scheduledAt ? new Date(event.scheduledAt).toLocaleString("es-AR") : "", event.packageName, event.total, event.paid, event.total - event.paid, eventStatusLabel[event.status] ?? event.status]);
  const csv = [header, ...rows].map((row) => row.map(csvValue).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `growup-eventos-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
}
