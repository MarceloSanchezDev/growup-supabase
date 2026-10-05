import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { roles } from "../config/roles";
import { demoEvents, eventStatusLabel } from "../modules/events/demoEvents";
import { ars } from "../shared/money";
import { isSupabaseConfigured } from "../supabase/client";

const nav = [
  ["Inicio", "/"], ["Calendario", "/calendar"], ["Ventas", "/sales"], ["Paquetes", "/packages"], ["Resultados", "/reports"], ["Equipo", "/team"],
];

export default function App() {
  const [events, setEvents] = useState(demoEvents);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [role] = useState(roles.OWNER);
  const filteredEvents = useMemo(() => events.filter((event) => `${event.client} ${event.packageName}`.toLowerCase().includes(search.toLowerCase())), [events, search]);
  const totals = useMemo(() => events.reduce((result, event) => ({ sold: result.sold + event.total, collected: result.collected + event.paid }), { sold: 0, collected: 0 }), [events]);

  function createInquiry(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const total = Number(data.get("total")) || 0;
    setEvents((current) => [...current, { id: crypto.randomUUID(), date: "2026-10-05", time: data.get("time") || "20:00", client: data.get("client") || "Nueva consulta", packageName: data.get("package") || "Paquete a definir", total, paid: 0, status: "pending_deposit" }]);
    setShowForm(false);
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">G</span><div><strong>GrowUp</strong><small>Eventos & experiencias</small></div></div><div className="account"><span className="month">Octubre 2026</span><span className="avatar">MD</span><span>Martina · Dueña</span></div></header>
    {!isSupabaseConfigured && <div className="setup-notice">Vista de desarrollo con datos de ejemplo. La conexión a Supabase se habilita al cargar las credenciales del proyecto.</div>}
    <div className="workspace"><aside><nav>{nav.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}>{label}</NavLink>)}</nav><div className="team-card"><b>Tu equipo</b><p>2 vendedoras activas y una administradora.</p><button>Ver permisos</button></div></aside>
      <main><section className="heading"><div><p>Panel de hoy · Lunes 5 de octubre</p><h1>Todo bajo control.</h1><span>Ventas, señas y eventos en un solo lugar.</span></div><button className="primary" onClick={() => setShowForm(true)}>+ Nuevo evento</button></section>
      <section className="metrics"><Metric label="Vendido este mes" value={ars(totals.sold)} detail="Eventos registrados" tone="purple"/><Metric label="Cobrado" value={ars(totals.collected)} detail={`${Math.round((totals.collected / Math.max(totals.sold, 1)) * 100)}% del total vendido`} tone="pink"/><Metric label="Pendiente de cobro" value={ars(totals.sold - totals.collected)} detail="Saldos por cobrar" tone="amber"/><Metric label="Costos de viaje" value={ars(118000)} detail="Cargados este mes" tone="teal"/></section>
      <section className="content-grid"><article className="agenda"><div className="section-head"><div><h2>Agenda de hoy</h2><span>{events.length} eventos y consultas programados</span></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar evento" aria-label="Buscar evento"/></div><div className="event-list">{filteredEvents.map((item) => <div className="event" key={item.id}><time>{item.time}</time><i/><div className="event-main"><b>{item.client}</b><span>{item.packageName}</span></div><div className="event-meta"><b>{ars(item.total)}</b><em className={item.status}>{eventStatusLabel[item.status]}</em></div><button className="more" aria-label={`Opciones de ${item.client}`}>•••</button></div>)}{filteredEvents.length === 0 && <p className="empty">No encontramos eventos con esa búsqueda.</p>}</div><button className="link-button">Ver calendario completo <span>›</span></button></article>
      <div className="side"><article className="result"><span>Resultado estimado</span><strong>{ars(totals.collected - 118000)}</strong><div><i/></div><small>Calculado sobre lo cobrado menos los costos de viaje cargados.</small></article><article className="review"><h2>Para revisar <b>3</b></h2><p><i/> <span><strong>2 eventos</strong><br/>todavía sin seña mínima</span></p><p><i/> <span><strong>1 reprogramación</strong><br/>pendiente de nueva fecha</span></p></article></div></section></main></div>
    {showForm && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={createInquiry}><button className="close" type="button" onClick={() => setShowForm(false)}>×</button><h2>Nueva consulta</h2><p>Podrás completar la venta, la seña y el horario luego.</p><label>Cliente<input name="client" required placeholder="Nombre del cliente" /></label><label>Paquete o servicio<input name="package" required placeholder="Ej. Spa Kids" /></label><div className="form-row"><label>Horario<input name="time" type="time" /></label><label>Total acordado<input name="total" type="number" min="0" placeholder="0" /></label></div><div className="actions"><button type="button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary" type="submit">Crear consulta</button></div></form></div>}
  </div>;
}

function Metric({ label, value, detail, tone }) { return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
