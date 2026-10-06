import { useState } from "react";
import { importHistoricalEvents } from "./importService";
import { readGrowUpWorkbook } from "./xlsxImport";

export default function ImportScreen({ profile, userId }) {
  const [rows, setRows] = useState([]); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function preview(event) { const file = event.target.files?.[0]; if (!file) return; try { setRows(await readGrowUpWorkbook(file)); setMessage(""); } catch { setMessage("No se pudo leer el archivo. Elegí el Excel original de GrowUp."); } }
  async function confirmImport() { if (!window.confirm(`Se cargarán ${rows.length} eventos históricos. Esta acción no se puede deshacer desde esta pantalla.`)) return; setLoading(true); try { const result = await importHistoricalEvents(rows, userId); setMessage(`Importación completada: ${result.events} eventos y ${result.payments} señas.${result.skipped ? ` Se omitieron ${result.skipped} ya existentes.` : ""}`); } catch (error) { setMessage(error.message); } finally { setLoading(false); } }
  if (profile?.role !== "owner") return <main className="auth-page"><section className="auth-card"><h1>Acceso restringido</h1><p>Solo la dueña puede importar el historial.</p><a href="/">Volver al panel</a></section></main>;
  const cancelled = rows.filter((row) => row.cancelled).length; const missing = rows.filter((row) => !row.timeRange || !row.location || !row.phone).length;
  return <main className="auth-page"><section className="auth-card"><h1>Importar historial 2026</h1><p>Primero se muestra una vista previa. El archivo se procesa localmente antes de guardarse.</p><input type="file" accept=".xlsx" onChange={preview}/>{rows.length > 0 && <><p><strong>{rows.length}</strong> eventos detectados. {cancelled} cancelados y {missing} con algún dato operativo faltante.</p><button className="primary" disabled={loading} onClick={confirmImport}>{loading ? "Importando…" : "Importar historial"}</button></>}{message && <p>{message}</p>}<p><a href="/">Volver al panel</a></p></section></main>;
}
