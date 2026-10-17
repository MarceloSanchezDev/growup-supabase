import { useState } from "react";
import { addPayment, cancelEvent, rescheduleEvent, saveEventRoute, updateReservation } from "./eventService";
import { eventStatusLabel } from "./demoEvents";
import { ars } from "../../shared/money";
import { calculateRoute } from "../maps/routeService";

function duration(seconds) {
  if (seconds == null) return "Sin cálculo";
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

function sellerName(event, profile, team) {
  return team.find((member) => member.id === event.createdBy)?.full_name || (event.createdBy === profile?.id ? profile.full_name : "Sin asignar");
}

export default function EventDetailScreen({ event, packages, profile, team, userId, accessToken, onRefresh }) {
  const [mode, setMode] = useState(null);
  const [message, setMessage] = useState("");
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const isResponsible = event?.createdBy === profile?.id;
  const canEdit = profile?.role === "owner" || isResponsible;
  if (!event) return <main className="event-detail-page"><p className="empty">Cargando el evento o el evento no existe.</p></main>;
  const address = [event.location, event.locality].filter(Boolean).join(", ");
  const mapsUrl = canEdit && address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const mapEmbedUrl = canEdit && address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null;
  const balance = Math.max(event.total - event.paid, 0);
  const hasRoute = event.routeDistanceMeters != null && event.routeDurationSeconds != null;
  const phoneForWhatsapp = event.phone?.replace(/\D/g, "");
  const eventText = `Hola ${event.client}. Te escribimos por tu reserva de GrowUp para el ${event.scheduledAt ? new Date(event.scheduledAt).toLocaleDateString("es-AR") : "día a confirmar"}. ${address ? `Dirección: ${address}.` : ""}`;
  const whatsappUrl = phoneForWhatsapp ? `https://wa.me/${phoneForWhatsapp}?text=${encodeURIComponent(eventText)}` : null;
  async function copyEventDetails() {
    try {
      await navigator.clipboard.writeText(`${event.client}\n${event.scheduledAt ? new Date(event.scheduledAt).toLocaleDateString("es-AR") : "Sin fecha"} · ${event.time}\n${address || "Sin dirección"}`);
      setMessage("Datos del evento copiados.");
    } catch {
      setMessage("No se pudieron copiar los datos desde este navegador.");
    }
  }
  async function calculateAndSaveRoute() {
    if (!address) {
      setMessage("Cargá la dirección del evento antes de calcular la ruta.");
      return;
    }
    setCalculatingRoute(true);
    setMessage("");
    try {
      const route = await calculateRoute(address, accessToken);
      await saveEventRoute(event.id, route);
      await onRefresh();
      setMessage("Ruta calculada y guardada en la reserva.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setCalculatingRoute(false);
    }
  }
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
  async function saveEdit(formEvent) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const blocks = data.getAll("time").map((time, index) => ({ time, serviceHours: data.getAll("hours")[index] ? Number(data.getAll("hours")[index]) : null, notes: data.getAll("note")[index], packageInfo: packages.find((item) => item.id === data.getAll("package")[index]) }));
    try { await updateReservation({ event, clientName: data.get("client"), phone: data.get("phone"), email: data.get("email"), location: data.get("location"), locality: data.get("locality"), eventType: data.get("eventType"), travelCost: Number(data.get("travelCost")), details: data.get("details"), total: Number(data.get("total")), date: data.get("date"), serviceBlocks: blocks }); await onRefresh(); setMode(null); setMessage("Reserva actualizada correctamente."); } catch (error) { setMessage(error.message); }
  }
  return <main className="event-detail-page">
    <header className="event-detail-header"><div><p>Detalle del evento</p><h1>{event.client}</h1><span>{eventStatusLabel[event.status] ?? event.status}</span></div><a className="link-button" href="/">← Volver al panel</a></header>
    {message && <div className="setup-notice">{message}</div>}
    <section className="event-detail-grid">
      <article className="detail-card detail-summary"><h2>Reserva</h2><Detail label="Tipo" value={event.eventType || "Sin especificar"}/><Detail label="Fecha" value={event.scheduledAt ? new Date(event.scheduledAt).toLocaleDateString("es-AR") : "Sin fecha"}/><ServiceSchedule blocks={event.serviceBlocks} fallback={event}/>{canEdit && <><Detail label="Vendedora" value={sellerName(event, profile, team)}/><Detail label="Notas" value={event.details || "Sin notas"}/></>}</article>
      {canEdit && <article className="detail-card detail-money"><h2>Importes</h2><Detail label="Total vendido" value={ars(event.total)}/><Detail label="Cobrado" value={ars(event.paid)}/><Detail label="Saldo pendiente" value={ars(balance)}/><Detail label="Costo interno de viaje" value={event.travelCost == null ? "Sin cargar" : ars(event.travelCost)}/></article>}
      <article className="detail-card detail-contact"><h2>Cliente y ubicación</h2>{canEdit ? <><Detail label="Teléfono" value={event.phone || "Sin teléfono"}/><Detail label="Correo" value={event.email || "Sin correo"}/><Detail label="Dirección" value={address || "Sin dirección"}/>{mapsUrl && <a className="primary maps-action" href={mapsUrl} target="_blank" rel="noreferrer">Abrir en Google Maps ↗</a>}</> : <p className="empty">Evento del equipo. Los datos de cliente son privados.</p>}</article>
      {canEdit && <article className="detail-card detail-route"><h2>Ruta desde UNAHUR</h2><Detail label="Origen" value={event.routeOrigin || "UNAHUR (ruta aún no calculada)"}/><Detail label="Distancia" value={event.routeDistanceMeters == null ? "Sin cálculo" : `${(event.routeDistanceMeters / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`}/><Detail label="Tiempo estimado" value={duration(event.routeDurationSeconds)}/>{!hasRoute && <button className="link-button route-detail-button" type="button" onClick={calculateAndSaveRoute} disabled={calculatingRoute || !address}>{calculatingRoute ? "Calculando ruta…" : "Calcular ruta"}</button>}{!hasRoute && !address && <p className="route-detail-help">Cargá una dirección para habilitar el cálculo.</p>}{mapEmbedUrl ? <iframe title={`Mapa de ${event.client}`} src={mapEmbedUrl} loading="lazy"/> : <p className="empty">Cargá una dirección para visualizar el mapa.</p>}</article>}
    </section>
    {canEdit && <section className="detail-actions"><h2>Acciones</h2><div><button className="primary" onClick={() => setMode("payment")}>Registrar pago</button>{whatsappUrl && <a className="link-button" href={whatsappUrl} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}<button className="link-button" onClick={copyEventDetails}>Copiar datos</button><button className="link-button" onClick={() => setMode("edit")}>Editar reserva</button><a className="link-button" href={`/#duplicar=${event.id}`}>Duplicar reserva</a><button className="link-button" onClick={() => setMode("reschedule")}>Reprogramar</button><button className="danger-button" onClick={() => setMode("cancel")}>Cancelar evento</button></div></section>}
    {mode === "edit" && <EditReservationForm event={event} packages={packages} onClose={() => setMode(null)} onSubmit={saveEdit}/>}
    {mode === "payment" && <section className="detail-form"><h2>Registrar pago</h2><form onSubmit={registerPayment}><label>Importe<input name="amount" type="number" min="1" defaultValue={balance || ""} required/></label><label>Nota<input name="note" placeholder="Ej. transferencia"/></label><div className="actions"><button type="button" onClick={() => setMode(null)}>Volver</button><button className="primary">Guardar pago</button></div></form></section>}
    {mode === "cancel" && <section className="detail-form"><h2>Cancelar evento</h2><p>Los pagos quedan registrados; no se genera devolución automática.</p><form onSubmit={submitAction}><label>Motivo opcional<input name="reason"/></label><div className="actions"><button type="button" onClick={() => setMode(null)}>Volver</button><button className="danger-button">Confirmar cancelación</button></div></form></section>}
    {mode === "reschedule" && <section className="detail-form"><h2>Reprogramar evento</h2><form onSubmit={submitAction}><div className="form-row"><label>Nueva fecha<input name="date" type="date" required/></label><label>Nuevo horario<input name="time" type="time" required/></label></div><div className="actions"><button type="button" onClick={() => setMode(null)}>Volver</button><button className="primary">Confirmar reprogramación</button></div></form></section>}
  </main>;
}

function Detail({ label, value }) { return <div className="detail-line"><span>{label}</span><strong>{value}</strong></div>; }

function ServiceSchedule({ blocks, fallback }) {
  const items = blocks?.length ? blocks : [{ id: fallback.id, time: fallback.time, packageName: fallback.packageName, serviceHours: fallback.serviceHours, notes: null }];
  return <div className="detail-line service-schedule"><span>Servicios programados</span>{items.map((block) => <div key={block.id}><strong>{block.time} · {block.packageName}</strong><small>{block.serviceHours ? `${block.serviceHours} ${block.serviceHours === 1 ? "hora" : "horas"}` : "Duración sin especificar"}{block.notes ? ` · ${block.notes}` : ""}</small></div>)}</div>;
}

function EditReservationForm({ event, packages, onClose, onSubmit }) {
  const blocks = event.serviceBlocks?.length ? event.serviceBlocks : [{ id: event.id, time: event.time, packageId: event.packageId, packageName: event.packageName, serviceHours: event.serviceHours, notes: "" }];
  return <section className="detail-form edit-reservation"><h2>Editar reserva</h2><form onSubmit={onSubmit}><div className="form-row"><label>Cliente<input name="client" defaultValue={event.client} required/></label><label>Teléfono<input name="phone" defaultValue={event.phone || ""}/></label></div><div className="form-row"><label>Correo<input name="email" type="email" defaultValue={event.email || ""}/></label><label>Fecha<input name="date" type="date" defaultValue={event.scheduledAt?.slice(0, 10)} required/></label></div><div className="form-row"><label>Lugar<input name="location" defaultValue={event.location || ""}/></label><label>Localidad<input name="locality" defaultValue={event.locality || ""}/></label></div><div className="form-row"><label>Tipo<input name="eventType" defaultValue={event.eventType || ""}/></label><label>Total de la reserva<input name="total" type="number" min="0" defaultValue={event.total} required/></label></div><label>Costo interno de viaje<input name="travelCost" type="number" min="0" defaultValue={event.travelCost ?? 0} required/></label><label>Notas<input name="details" defaultValue={event.details || ""}/></label><h3>Servicios y horarios</h3>{blocks.map((block) => <div className="edit-service" key={block.id}><input name="time" type="time" defaultValue={block.time} required/><select name="package" defaultValue={block.packageId || ""} required><option value="">Seleccionar servicio</option>{packages.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><input name="hours" type="number" min="0.5" step="0.5" defaultValue={block.serviceHours || ""} placeholder="Horas"/><input name="note" defaultValue={block.notes || ""} placeholder="Nota"/></div>)}<p className="edit-help">Para agregar o quitar servicios, duplicá la reserva y ajustá la nueva carga por ahora.</p><div className="actions"><button type="button" onClick={onClose}>Volver</button><button className="primary">Guardar cambios</button></div></form></section>;
}
