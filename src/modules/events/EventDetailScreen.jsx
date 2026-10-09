import { useState } from "react";
import { addPayment, cancelEvent, rescheduleEvent } from "./eventService";
import { eventStatusLabel } from "./demoEvents";
import { ars } from "../../shared/money";

function duration(seconds) {
  if (seconds == null) return "Sin cálculo";
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

function sellerName(event, profile, team) {
  return team.find((member) => member.id === event.createdBy)?.full_name || (event.createdBy === profile?.id ? profile.full_name : "Sin asignar");
}

export default function EventDetailScreen({ event, profile, team, userId, onRefresh }) {
  const [mode, setMode] = useState(null);
  const [message, setMessage] = useState("");
  const canEdit = profile?.role !== "viewer";
  if (!event) return <main className="event-detail-page"><p className="empty">Cargando el evento o el evento no existe.</p></main>;
  const address = [event.location, event.locality].filter(Boolean).join(", ");
  const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const mapEmbedUrl = address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null;
  const balance = Math.max(event.total - event.paid, 0);
  async function registerPayment(formEvent) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    try {
      await addPayment({ eventId: event.id, amount: Number(data.get("amount")), note: data.get("note"), userId });
      await onRefresh();
      setMode(null);
      setMessage("Pago registrado correctamente.");
    } catch (error) { setMessage(error.message); }
  }
  async function submitAction(formEvent) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    try {
      if (mode === "cancel") await cancelEvent(event.id, data.get("reason"));
      else await rescheduleEvent(event.id, data.get("date"), data.get("time"));
      await onRefresh();
      setMode(null);
      setMessage(mode === "cancel" ? "Evento cancelado. Los pagos quedaron registrados." : "Evento reprogramado correctamente.");
    } catch (error) { setMessage(error.message); }
  }
  return <main className="event-detail-page">
    <header className="event-detail-header"><div><p>Detalle del evento</p><h1>{event.client}</h1><span>{eventStatusLabel[event.status] ?? event.status}</span></div><a className="link-button" href="/">← Volver al panel</a></header>
    {message && <div className="setup-notice">{message}</div>}
    <section className="event-detail-grid">
      <article className="detail-card detail-summary"><h2>Evento</h2><Detail label="Servicio" value={event.packageName}/><Detail label="Tipo" value={event.eventType || "Sin especificar"}/><Detail label="Fecha y horario" value={`${event.scheduledAt ? new Date(event.scheduledAt).toLocaleDateString("es-AR") : "Sin fecha"} · ${event.time}`}/><Detail label="Duración" value={event.serviceHours ? `${event.serviceHours} ${event.serviceHours === 1 ? "hora" : "horas"}` : "Sin especificar"}/><Detail label="Vendedora" value={sellerName(event, profile, team)}/><Detail label="Notas" value={event.details || "Sin notas"}/></article>
      <article className="detail-card detail-money"><h2>Importes</h2><Detail label="Total vendido" value={ars(event.total)}/><Detail label="Cobrado" value={ars(event.paid)}/><Detail label="Saldo pendiente" value={ars(balance)}/><Detail label="Costo interno de viaje" value={event.travelCost == null ? "Sin cargar" : ars(event.travelCost)}/><Detail label="Peajes estimados" value={event.routeTollAmount == null ? "Sin información" : `${event.routeTollCurrency ?? ""} ${event.routeTollAmount.toLocaleString("es-AR")}`}/></article>
      <article className="detail-card detail-contact"><h2>Cliente y ubicación</h2><Detail label="Teléfono" value={event.phone || "Sin teléfono"}/><Detail label="Correo" value={event.email || "Sin correo"}/><Detail label="Dirección" value={address || "Sin dirección"}/>{mapsUrl && <a className="primary maps-action" href={mapsUrl} target="_blank" rel="noreferrer">Abrir en Google Maps ↗</a>}</article>
      <article className="detail-card detail-route"><h2>Ruta desde UNAHUR</h2><Detail label="Origen" value={event.routeOrigin || "UNAHUR (ruta aún no calculada)"}/><Detail label="Distancia" value={event.routeDistanceMeters == null ? "Sin cálculo" : `${(event.routeDistanceMeters / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`}/><Detail label="Tiempo estimado" value={duration(event.routeDurationSeconds)}/>{mapEmbedUrl ? <iframe title={`Mapa de ${event.client}`} src={mapEmbedUrl} loading="lazy"/> : <p className="empty">Cargá una dirección para visualizar el mapa.</p>}</article>
    </section>
    {canEdit && <section className="detail-actions"><h2>Acciones</h2><div><button className="primary" onClick={() => setMode("payment")}>Registrar pago</button><button className="link-button" onClick={() => setMode("reschedule")}>Reprogramar</button><button className="danger-button" onClick={() => setMode("cancel")}>Cancelar evento</button></div></section>}
    {mode === "payment" && <section className="detail-form"><h2>Registrar pago</h2><form onSubmit={registerPayment}><label>Importe<input name="amount" type="number" min="1" defaultValue={balance || ""} required/></label><label>Nota<input name="note" placeholder="Ej. transferencia"/></label><div className="actions"><button type="button" onClick={() => setMode(null)}>Volver</button><button className="primary">Guardar pago</button></div></form></section>}
    {mode === "cancel" && <section className="detail-form"><h2>Cancelar evento</h2><p>Los pagos quedan registrados; no se genera devolución automática.</p><form onSubmit={submitAction}><label>Motivo opcional<input name="reason"/></label><div className="actions"><button type="button" onClick={() => setMode(null)}>Volver</button><button className="danger-button">Confirmar cancelación</button></div></form></section>}
    {mode === "reschedule" && <section className="detail-form"><h2>Reprogramar evento</h2><form onSubmit={submitAction}><div className="form-row"><label>Nueva fecha<input name="date" type="date" required/></label><label>Nuevo horario<input name="time" type="time" required/></label></div><div className="actions"><button type="button" onClick={() => setMode(null)}>Volver</button><button className="primary">Confirmar reprogramación</button></div></form></section>}
  </main>;
}

function Detail({ label, value }) { return <div className="detail-line"><span>{label}</span><strong>{value}</strong></div>; }
