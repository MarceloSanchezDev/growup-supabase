import { useState } from "react";
import { signInWithPassword, signUpWithPassword } from "./authService";

export default function AuthScreen() {
  const [mode, setMode] = useState("sign-in");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const action = mode === "sign-in" ? signInWithPassword : signUpWithPassword;
    const { error } = await action(data.get("email"), data.get("password"), data.get("fullName"));
    setBusy(false); setMessage(error ? error.message : mode === "sign-up" ? "Cuenta creada. Revisá tu correo si Supabase solicita confirmación." : "");
  }
  return <main className="auth-page"><section className="auth-card"><div className="brand"><span className="brand-mark">G</span><div><strong>GrowUp</strong><small>Eventos & experiencias</small></div></div><h1>{mode === "sign-in" ? "Bienvenida" : "Crear cuenta"}</h1><p>{mode === "sign-in" ? "Ingresá para gestionar los eventos." : "Creá la cuenta que administrará GrowUp."}</p><form onSubmit={submit}>{mode === "sign-up" && <label>Nombre completo<input name="fullName" required /></label>}<label>Correo electrónico<input name="email" type="email" required /></label><label>Contraseña<input name="password" type="password" minLength="6" required /></label>{message && <p>{message}</p>}<button className="primary" disabled={busy}>{busy ? "Procesando…" : mode === "sign-in" ? "Ingresar" : "Crear cuenta"}</button></form><button onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }} type="button">{mode === "sign-in" ? "¿Es tu primera vez? Crear cuenta" : "Ya tengo una cuenta"}</button></section></main>;
}
