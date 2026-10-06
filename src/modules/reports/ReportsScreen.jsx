import { useMemo, useState } from "react";
import { ars } from "../../shared/money";

const excludedStatuses = new Set(["cancelled", "rescheduled"]);

function isInMonth(value, month) {
  return Boolean(value) && value.slice(0, 7) === month;
}

function sellerName(event, team) {
  return event.historicalSeller || team.find((member) => member.id === event.createdBy)?.full_name || "Sin asignar";
}

export default function ReportsScreen({ profile, events, expenses, team, onBack }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const report = useMemo(() => {
    const eventSales = events.filter((event) => isInMonth(event.scheduledAt, month) && !excludedStatuses.has(event.status));
    const payments = events.flatMap((event) => event.payments.map((payment) => ({ ...payment, event }))).filter((payment) => isInMonth(payment.paidAt, month));
    const periodExpenses = expenses.filter((expense) => isInMonth(expense.incurred_at, month));
    const sold = eventSales.reduce((sum, event) => sum + event.total, 0);
    const collected = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const pending = eventSales.reduce((sum, event) => sum + Math.max(event.total - event.paid, 0), 0);
    const spent = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const bySeller = Object.values(eventSales.reduce((all, event) => {
      const name = sellerName(event, team);
      const current = all[name] ?? { name, count: 0, sold: 0, collected: 0 };
      current.count += 1;
      current.sold += event.total;
      current.collected += event.payments.filter((payment) => isInMonth(payment.paidAt, month)).reduce((sum, payment) => sum + payment.amount, 0);
      all[name] = current;
      return all;
    }, {})).sort((a, b) => b.sold - a.sold);
    const byEvent = eventSales.map((event) => {
      const costs = expenses.filter((expense) => expense.event_id === event.id).reduce((sum, expense) => sum + expense.amount, 0);
      return { ...event, costs, margin: event.total - costs };
    }).sort((a, b) => b.margin - a.margin);
    return { sold, collected, pending, spent, result: collected - spent, eventSales, payments, periodExpenses, bySeller, byEvent };
  }, [events, expenses, month, team]);

  if (profile?.role !== "owner") return <main className="report-page"><section className="report-header"><button className="link-button" onClick={onBack}>← Volver al panel</button><h1>Reportes</h1><p>Solo la dueña puede consultar los reportes financieros.</p></section></main>;
  return <main className="report-page"><section className="report-header"><div><button className="link-button" onClick={onBack}>← Volver al panel</button><p>Control financiero interno</p><h1>Reportes</h1><span>Las ventas se miden por fecha del evento; lo cobrado, por fecha del pago.</span></div><label>Mes a analizar<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></section><section className="metrics report-metrics"><Card label="Vendido" value={ars(report.sold)} detail={`${report.eventSales.length} eventos del mes`} tone="purple"/><Card label="Cobrado" value={ars(report.collected)} detail={`${report.payments.length} pagos recibidos`} tone="pink"/><Card label="Pendiente" value={ars(report.pending)} detail="Saldos de eventos del mes" tone="amber"/><Card label="Gastos" value={ars(report.spent)} detail={`${report.periodExpenses.length} gastos cargados`} tone="teal"/><Card label="Resultado de caja" value={ars(report.result)} detail="Cobrado menos gastos del período" tone="purple"/></section><section className="report-grid"><article className="report-card"><h2>Ventas por vendedora</h2>{report.bySeller.length ? <table><thead><tr><th>Vendedora</th><th>Eventos</th><th>Vendido</th><th>Cobrado en el mes</th></tr></thead><tbody>{report.bySeller.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.count}</td><td>{ars(item.sold)}</td><td>{ars(item.collected)}</td></tr>)}</tbody></table> : <Empty />}</article><article className="report-card"><h2>Rentabilidad por evento</h2><p className="report-help">El margen usa solo gastos asociados a cada evento. Si no asignás gastos, se muestra el total vendido como margen estimado.</p>{report.byEvent.length ? <table><thead><tr><th>Evento</th><th>Vendido</th><th>Costos asociados</th><th>Margen estimado</th></tr></thead><tbody>{report.byEvent.map((item) => <tr key={item.id}><td>{item.client}<small>{item.packageName}</small></td><td>{ars(item.total)}</td><td>{ars(item.costs)}</td><td>{ars(item.margin)}</td></tr>)}</tbody></table> : <Empty />}</article><article className="report-card"><h2>Gastos del período</h2>{report.periodExpenses.length ? <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Importe</th></tr></thead><tbody>{report.periodExpenses.map((item) => <tr key={item.id}><td>{new Date(`${item.incurred_at}T12:00:00`).toLocaleDateString("es-AR")}</td><td>{item.category}<small>{item.note || "Sin nota"}</small></td><td>{ars(item.amount)}</td></tr>)}</tbody></table> : <Empty />}</article></section></main>;
}

function Card({ label, value, detail, tone }) { return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function Empty() { return <p className="empty">No hay movimientos para el mes seleccionado.</p>; }
