import { useEffect, useMemo, useState } from "react";
import AuthScreen from "../auth/AuthScreen";
import { getCurrentProfile, signOut } from "../auth/authService";
import {
  addPayment,
  cancelEvent,
  createEvent,
  listEvents,
  rescheduleEvent,
} from "../modules/events/eventService";
import { eventStatusLabel } from "../modules/events/demoEvents";
import { downloadEventsCsv } from "../modules/events/exportEvents";
import {
  createExpense,
  listExpenses,
} from "../modules/expenses/expenseService";
import {
  createPackage,
  listPackages,
} from "../modules/packages/packageService";
import { listTeam, updateMemberRole } from "../modules/team/teamService";
import ImportScreen from "../modules/imports/ImportScreen";
import ReportsScreen from "../modules/reports/ReportsScreen";
import EventDetailScreen from "../modules/events/EventDetailScreen";
import { calculateRoute } from "../modules/maps/routeService";
import {
  listNotifications,
  markNotificationsRead,
} from "../modules/notifications/notificationService";
import { ars } from "../shared/money";
import { isSupabaseConfigured, supabase } from "../supabase/client";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState([]);
  const [events, setEvents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calendarDay, setCalendarDay] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [paymentEvent, setPaymentEvent] = useState(null);
  const [actionEvent, setActionEvent] = useState(null);
  const [message, setMessage] = useState("");
  const refreshEvents = async () => setEvents(await listEvents());
  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, current) => setSession(current),
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return;
    Promise.all([getCurrentProfile(), listEvents(), listPackages(), listNotifications().catch(() => [])])
      .then(([currentProfile, currentEvents, currentPackages, currentNotifications]) => {
        setProfile(currentProfile);
        setEvents(currentEvents);
        setPackages(currentPackages);
        setNotifications(currentNotifications);
        if (currentProfile.role === "owner") {
          listTeam()
            .then(setTeam)
            .catch((error) => setMessage(error.message));
          listExpenses()
            .then(setExpenses)
            .catch((error) => setMessage(error.message));
        }
      })
      .catch((error) => setMessage(error.message));
  }, [session]);
  const filteredEvents = useMemo(
    () =>
      events.filter((event) =>
        `${event.client} ${event.packageName}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [events, search],
  );
  const totals = useMemo(
    () =>
      events
        .filter((event) => !["cancelled", "rescheduled"].includes(event.status))
        .reduce(
          (result, event) => ({
            sold: result.sold + event.total,
            collected: result.collected + event.paid,
          }),
          { sold: 0, collected: 0 },
        ),
    [events],
  );
  const currentMonth = new Date().toISOString().slice(0, 7);
  const next24Hours = useMemo(() => {
    const now = new Date();
    const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return events.filter((item) => {
      const scheduledAt = new Date(item.scheduledAt);
      return !["cancelled", "rescheduled", "completed"].includes(item.status) && scheduledAt >= now && scheduledAt <= limit;
    });
  }, [events]);
  const monthlyExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.incurred_at?.startsWith(currentMonth))
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses, currentMonth],
  );
  async function createInquiry(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const packageInfo = packages.find(
      (item) => item.id === data.get("packageId"),
    );
    try {
      await createEvent({
        clientName: data.get("client"),
        phone: data.get("phone"),
        email: data.get("email"),
        location: data.get("location"),
        locality: data.get("locality"),
        eventType: data.get("eventType"),
        serviceHours: data.get("serviceHours") ? Number(data.get("serviceHours")) : null,
        travelCost: Number(data.get("travelCost")),
        route: data.get("routeData") ? JSON.parse(data.get("routeData")) : null,
        details: data.get("details"),
        packageInfo,
        total: packageInfo?.base_price ?? Number(data.get("total")),
        date: data.get("date"),
        time: data.get("time"),
        userId: session.user.id,
      });
      await refreshEvents();
      setShowEventForm(false);
      setMessage("Consulta creada correctamente.");
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function savePackage(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await createPackage(data.get("name"), Number(data.get("price")));
      setPackages(await listPackages());
      setShowPackageForm(false);
      setMessage("Paquete creado con su precio base.");
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function changeRole(id, role) {
    try {
      await updateMemberRole(id, role);
      setTeam(await listTeam());
      setMessage("Permiso actualizado.");
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function saveExpense(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await createExpense({
        category: data.get("category"),
        amount: Number(data.get("amount")),
        date: data.get("date"),
        note: data.get("note"),
        eventId: data.get("eventId"),
      });
      setExpenses(await listExpenses());
      setShowExpenseForm(false);
      setMessage("Gasto registrado.");
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function registerPayment(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await addPayment({
        eventId: paymentEvent.id,
        amount: Number(data.get("amount")),
        note: data.get("note"),
        userId: session.user.id,
      });
      await refreshEvents();
      setPaymentEvent(null);
      setMessage(
        "Pago registrado. El estado del evento se actualizó según la seña acumulada.",
      );
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function submitEventAction(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      if (actionEvent.type === "cancel")
        await cancelEvent(actionEvent.event.id, data.get("reason"));
      else
        await rescheduleEvent(
          actionEvent.event.id,
          data.get("date"),
          data.get("time"),
        );
      await refreshEvents();
      setMessage(
        actionEvent.type === "cancel"
          ? "Evento cancelado. Los pagos quedaron registrados, sin devolución automática."
          : "Evento reprogramado. Los pagos se trasladaron a la nueva fecha.",
      );
      setActionEvent(null);
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function claimOwner() {
    const { error } = await supabase.rpc("claim_first_owner");
    if (error) {
      setMessage(error.message);
      return;
    }
    setProfile(await getCurrentProfile());
    setMessage("Tu cuenta ahora es la dueña de GrowUp.");
  }
  async function readNotifications() {
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    try {
      await markNotificationsRead(unreadIds);
      setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    } catch (error) {
      setMessage(error.message);
    }
  }
  if (!isSupabaseConfigured)
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Falta conectar Supabase</h1>
          <p>Vercel debe terminar de aplicar las variables del proyecto.</p>
        </section>
      </main>
    );
  if (session === undefined)
    return <main className="auth-page">Cargando GrowUp…</main>;
  if (!session) return <AuthScreen />;
  if (window.location.hash === "#importar")
    return <ImportScreen profile={profile} userId={session.user.id} />;
  if (window.location.hash === "#reportes")
    return <ReportsScreen profile={profile} events={events} expenses={expenses} team={team} onBack={() => { window.location.hash = ""; window.location.reload(); }} />;
  const eventDetailId = new URLSearchParams(window.location.hash.slice(1)).get("evento");
  if (eventDetailId)
    return <EventDetailScreen event={events.find((event) => event.id === eventDetailId)} profile={profile} team={team} userId={session.user.id} onRefresh={refreshEvents} />;
  const canEditEvents = profile?.role !== "viewer";
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>GrowUp</strong>
            <small>Eventos & experiencias</small>
          </div>
        </div>
        <div className="account">
          <span className="avatar">
            {profile?.full_name?.slice(0, 2).toUpperCase() ?? "GU"}
          </span>
          <span>
            {profile?.full_name ?? session.user.email} ·{" "}
            {profile?.role ?? "cargando"}
          </span>
          <button className="sign-out" onClick={signOut}>
            Salir
          </button>
        </div>
      </header>
      {message && <div className="setup-notice">{message}</div>}
      <div className="workspace">
        <main>
          <section className="heading">
            <div>
              <p>Panel de eventos</p>
              <h1>Todo bajo control.</h1>
              <span>Ventas, señas y eventos en un solo lugar.</span>
            </div>
            <div>
              {profile?.role === "owner" && (
                <>
                  <button
                    className="link-button"
                    onClick={() => setShowPackageForm(true)}
                  >
                    + Paquete
                  </button>
                  <button
                    className="link-button"
                    onClick={() => setShowExpenseForm(true)}
                  >
                    + Gasto
                  </button>
                  <button
                    className="link-button"
                    onClick={() => { window.location.hash = "#importar"; window.location.reload(); }}
                  >
                    Importar historial
                  </button>
                  <button className="link-button" onClick={() => downloadEventsCsv(events)}>
                    Exportar Excel
                  </button>
                  <button className="link-button" onClick={() => { window.location.hash = "#reportes"; window.location.reload(); }}>
                    Ver reportes
                  </button>
                </>
              )}
              {canEditEvents && (
                <button
                  className="primary"
                  onClick={() => setShowEventForm(true)}
                >
                  + Nuevo evento
                </button>
              )}
            </div>
          </section>
          {profile?.role === "seller" && (
            <button className="link-button" onClick={claimOwner}>
              Activar esta primera cuenta como dueña
            </button>
          )}
          {showEventForm && (
            <EventForm
              packages={packages}
              accessToken={session.access_token}
              onClose={() => setShowEventForm(false)}
              onSubmit={createInquiry}
            />
          )}
          <section className="metrics">
            <Metric
              label="Vendido"
              value={ars(totals.sold)}
              detail="Eventos registrados"
              tone="purple"
            />
            <Metric
              label="Cobrado"
              value={ars(totals.collected)}
              detail="Señas y pagos cargados"
              tone="pink"
            />
            <Metric
              label="Pendiente"
              value={ars(totals.sold - totals.collected)}
              detail="Saldos por cobrar"
              tone="amber"
            />
          </section>
          <section className="content-grid">
            <CalendarAgenda events={filteredEvents} month={calendarMonth} selectedDay={calendarDay} onMonthChange={(month) => { setCalendarMonth(month); setCalendarDay(""); }} onSelectDay={setCalendarDay} canEdit={canEditEvents} onPayment={setPaymentEvent} onAction={setActionEvent} />
            <div className="side">
              <ReminderPanel events={next24Hours} />
              <NotificationPanel notifications={notifications} onRead={readNotifications} />
              <article className="result">
                <span>Resultado mensual</span>
                <strong>{ars(totals.collected - monthlyExpenses)}</strong>
                <small>Cobrado menos gastos cargados del mes.</small>
              </article>
              <article className="review">
                <h2>Paquetes activos</h2>
                <p>
                  {packages.length
                    ? packages.map((item) => (
                        <span key={item.id}>
                          <strong>{item.name}</strong>
                          <br />
                          {ars(item.base_price)}
                        </span>
                      ))
                    : "La dueña puede crear el primer paquete."}
                </p>
              </article>
              {profile?.role === "owner" && (
                <>
                  <article className="review">
                    <h2>Gastos del mes</h2>
                    <p>
                      <strong>{ars(monthlyExpenses)}</strong>
                      <br />
                      {
                        expenses.filter((expense) =>
                          expense.incurred_at?.startsWith(currentMonth),
                        ).length
                      }{" "}
                      movimientos cargados
                    </p>
                  </article>
                  <article className="review">
                    <h2>Equipo</h2>
                    {team.map((member) => (
                      <p key={member.id}>
                        <span>
                          <strong>{member.full_name}</strong>
                          <br />
                          <select
                            value={member.role}
                            onChange={(event) =>
                              changeRole(member.id, event.target.value)
                            }
                          >
                            <option value="owner">Dueña</option>
                            <option value="seller">Vendedora</option>
                            <option value="viewer">Consulta</option>
                          </select>
                        </span>
                      </p>
                    ))}
                  </article>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
      {showPackageForm && (
        <PackageForm
          onClose={() => setShowPackageForm(false)}
          onSubmit={savePackage}
        />
      )}{" "}
      {showExpenseForm && (
        <ExpenseForm
          events={events}
          onClose={() => setShowExpenseForm(false)}
          onSubmit={saveExpense}
        />
      )}{" "}
      {paymentEvent && (
        <PaymentForm
          event={paymentEvent}
          onClose={() => setPaymentEvent(null)}
          onSubmit={registerPayment}
        />
      )}{" "}
      {actionEvent && (
        <EventActionForm
          action={actionEvent}
          onClose={() => setActionEvent(null)}
          onSubmit={submitEventAction}
        />
      )}
    </div>
  );
}

function ReminderPanel({ events }) {
  return (
    <article className="review reminders">
      <h2>Próximas 24 horas <b>{events.length}</b></h2>
      {events.length ? events.map((event) => (
        <div className="reminder" key={event.id}>
          <strong>{event.client} · {event.time}</strong>
          <span>{event.eventType || event.packageName}</span>
          {event.serviceHours && <span>Duración: {event.serviceHours} {event.serviceHours === 1 ? "hora" : "horas"}</span>}
          <span>{[event.location, event.locality].filter(Boolean).join(" · ") || "Lugar a confirmar"}</span>
          {event.phone && <span>Tel. {event.phone}</span>}
          <small>Saldo: {ars(Math.max(event.total - event.paid, 0))}</small>
        </div>
      )) : <p className="empty">No hay eventos programados en las próximas 24 horas.</p>}
    </article>
  );
}

function NotificationPanel({ notifications, onRead }) {
  const unread = notifications.filter((item) => !item.read_at).length;
  return (
    <article className="review notifications">
      <h2>Notificaciones {unread > 0 && <b>{unread}</b>}</h2>
      {notifications.length ? <>
        <div className="notification-list">
          {notifications.slice(0, 5).map((item) => (
            <div className={item.read_at ? "notification read" : "notification"} key={item.id}>
              <strong>{item.message}</strong>
              <span>{new Date(item.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
          ))}
        </div>
        {unread > 0 && <button className="link-button" onClick={onRead}>Marcar como leídas</button>}
      </> : <p className="empty">Todavía no tenés notificaciones.</p>}
    </article>
  );
}

function EventForm({ packages, accessToken, onClose, onSubmit }) {
  const [location, setLocation] = useState("");
  const [locality, setLocality] = useState("");
  const [travelCost, setTravelCost] = useState("90300");
  const [route, setRoute] = useState(null);
  const [routeMessage, setRouteMessage] = useState("");
  const [calculating, setCalculating] = useState(false);
  async function calculateTravel(locationValue = location, localityValue = locality) {
    const destination = [locationValue, localityValue].filter(Boolean).join(", ");
    if (!destination) {
      setRouteMessage("Ingresá al menos el lugar o la localidad para calcular la ruta.");
      return;
    }
    setCalculating(true);
    setRouteMessage("");
    try {
      const result = await calculateRoute(destination, accessToken);
      setRoute(result);
    } catch (error) {
      setRoute(null);
      setRouteMessage(error.message);
    } finally {
      setCalculating(false);
    }
  }
  const kilometers = route ? (route.distanceMeters / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 }) : null;
  const minutes = route ? Math.round(route.durationSeconds / 60) : null;
  return (
    <section className="inline-event-form">
      <div className="inline-form-heading">
        <div><p>Nueva carga</p><h2>Registrar evento</h2><span>Completá los datos sin salir de la agenda.</span></div>
        <button className="close" type="button" onClick={onClose} aria-label="Cerrar formulario">×</button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="inline-form-grid">
          <label>Cliente<input name="client" required /></label>
          <label>Teléfono<input name="phone" type="tel" /></label>
          <label>Correo<input name="email" type="email" /></label>
          <label>Lugar<input name="location" value={location} onChange={(event) => { setLocation(event.target.value); setRoute(null); }} placeholder="Dirección o salón" /></label>
          <label>Localidad<input name="locality" value={locality} onChange={(event) => { setLocality(event.target.value); setRoute(null); }} /></label>
          <label>Tipo de evento<input name="eventType" placeholder="Ej. cumpleaños, boda o 15 años" /></label>
          <label>Horas de servicio<input name="serviceHours" type="number" min="0.5" step="0.5" placeholder="Ej. 3" /></label>
          <label>Costo interno de viaje<input name="travelCost" type="number" min="0" step="1" value={travelCost} onChange={(event) => setTravelCost(event.target.value)} required /></label>
          <label>Paquete<select name="packageId" required><option value="">Seleccionar paquete</option>{packages.map((item) => <option value={item.id} key={item.id}>{item.name} · {ars(item.base_price)}</option>)}</select></label>
          <label>Fecha<input name="date" type="date" required /></label>
          <label>Horario<input name="time" type="time" required /></label>
          <label className="form-wide">Detalle interno<input name="details" placeholder="Observaciones del evento" /></label>
        </div>
        <section className="route-calculator">
          <div><strong>Ruta desde UNAHUR</strong><span>Calculala solo cuando necesites cotizar el traslado.</span></div>
          <button className="link-button" type="button" onClick={() => calculateTravel()} disabled={calculating}>{calculating ? "Calculando…" : route ? "Recalcular ruta" : "Calcular ruta"}</button>
          {route && <p><strong>{kilometers} km · {minutes} min</strong><small>Powered by Google</small></p>}
          {routeMessage && <p className="route-error">{routeMessage}</p>}
          <input type="hidden" name="routeData" value={route ? JSON.stringify(route) : ""} />
        </section>
        <div className="actions"><button type="button" onClick={onClose}>Cancelar</button><button className="primary" type="submit">Crear consulta</button></div>
      </form>
    </section>
  );
}
function PackageForm({ onClose, onSubmit }) {
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={onSubmit}>
        <button className="close" type="button" onClick={onClose}>
          ×
        </button>
        <h2>Nuevo paquete</h2>
        <label>
          Nombre
          <input name="name" required placeholder="Ej. Spa Kids" />
        </label>
        <label>
          Precio base
          <input name="price" type="number" min="0" required />
        </label>
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="submit">
            Guardar paquete
          </button>
        </div>
      </form>
    </div>
  );
}
function ExpenseForm({ events, onClose, onSubmit }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={onSubmit}>
        <button className="close" type="button" onClick={onClose}>
          ×
        </button>
        <h2>Registrar gasto</h2>
        <label>
          Concepto
          <input
            name="category"
            required
            placeholder="Ej. traslado, insumo o alquiler"
          />
        </label>
        <label>
          Importe
          <input name="amount" type="number" min="0" required />
        </label>
        <label>
          Fecha
          <input name="date" type="date" required defaultValue={today} />
        </label>
        <label>
          Nota opcional
          <input name="note" placeholder="Detalle interno" />
        </label>
        <label>
          Asociar a un evento (opcional)
          <select name="eventId" defaultValue="">
            <option value="">Gasto general del negocio</option>
            {events.filter((item) => !["cancelled", "rescheduled"].includes(item.status)).map((item) => <option key={item.id} value={item.id}>{item.client} · {item.packageName}</option>)}
          </select>
        </label>
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="submit">
            Guardar gasto
          </button>
        </div>
      </form>
    </div>
  );
}
function PaymentForm({ event, onClose, onSubmit }) {
  const requiredDeposit = Math.ceil(event.total * 0.1);
  const remainingForDeposit = Math.max(requiredDeposit - event.paid, 0);
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={onSubmit}>
        <button className="close" type="button" onClick={onClose}>
          ×
        </button>
        <h2>Registrar pago</h2>
        <p>
          {event.client} · total {ars(event.total)}
        </p>
        <p>
          Seña mínima: {ars(requiredDeposit)}. Falta para confirmar:{" "}
          {ars(remainingForDeposit)}.
        </p>
        <label>
          Importe recibido
          <input
            name="amount"
            type="number"
            min="1"
            required
            defaultValue={remainingForDeposit || ""}
          />
        </label>
        <label>
          Nota opcional
          <input name="note" placeholder="Ej. transferencia" />
        </label>
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="submit">
            Registrar pago
          </button>
        </div>
      </form>
    </div>
  );
}
function EventActionForm({ action, onClose, onSubmit }) {
  const isCancellation = action.type === "cancel";
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={onSubmit}>
        <button className="close" type="button" onClick={onClose}>
          ×
        </button>
        <h2>{isCancellation ? "Cancelar evento" : "Reprogramar evento"}</h2>
        <p>
          {isCancellation
            ? "Los pagos, incluida la seña, quedarán registrados. No se generará devolución automática."
            : "La venta y los pagos existentes se trasladarán a la nueva fecha."}
        </p>
        {isCancellation ? (
          <label>
            Motivo opcional
            <input name="reason" placeholder="Ej. cancelación del cliente" />
          </label>
        ) : (
          <div className="form-row">
            <label>
              Nueva fecha
              <input name="date" type="date" required />
            </label>
            <label>
              Nuevo horario
              <input name="time" type="time" required />
            </label>
          </div>
        )}
        <div className="actions">
          <button type="button" onClick={onClose}>
            Volver
          </button>
          <button className="primary" type="submit">
            {isCancellation
              ? "Confirmar cancelación"
              : "Confirmar reprogramación"}
          </button>
        </div>
      </form>
    </div>
  );
}
function Metric({ label, value, detail, tone }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function CalendarAgenda({ events, month, selectedDay, onMonthChange, onSelectDay, canEdit, onPayment, onAction }) {
  const [year, monthNumber] = month.split("-").map(Number); const start = new Date(year, monthNumber - 1, 1).getDay(); const days = new Date(year, monthNumber, 0).getDate();
  const byDay = events.reduce((all, event) => { const date = event.scheduledAt?.slice(0, 10); if (date?.startsWith(month)) (all[date] ??= []).push(event); return all; }, {});
  const selected = selectedDay ? byDay[selectedDay] ?? [] : [];
  return <article className="agenda calendar-agenda"><div className="section-head"><div><h2>Agenda y calendario</h2><span>{selectedDay ? `Eventos del ${new Date(`${selectedDay}T12:00:00`).toLocaleDateString("es-AR")}` : "Elegí un día para ver el detalle"}</span></div><input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} /></div><div className="calendar-week">{"D L M M J V S".split(" ").map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-days">{Array.from({ length: start }, (_, index) => <i key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => { const date = `${month}-${String(index + 1).padStart(2, "0")}`; const count = byDay[date]?.length ?? 0; return <button type="button" className={selectedDay === date ? "selected" : ""} key={date} onClick={() => onSelectDay(date)}>{index + 1}{count > 0 && <b>{count}</b>}</button>; })}</div>{selectedDay && <div className="event-list">{selected.map((item) => <div className="event" key={item.id}><time>{item.time}</time><i/><div className="event-main"><b>{item.client}</b><span>{item.packageName}{item.serviceHours ? ` · ${item.serviceHours} ${item.serviceHours === 1 ? "hora" : "horas"}` : ""}</span></div><div className="event-meta"><b>{ars(item.total)}</b><em className={item.status}>{eventStatusLabel[item.status]}</em><a className="link-button" href={`#evento=${item.id}`} target="_blank" rel="noreferrer">Ver más</a></div></div>)}{selected.length === 0 && <p className="empty">No hay eventos para este día.</p>}</div>}</article>;
}
