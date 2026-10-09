export async function calculateRoute(destination, accessToken) {
  const response = await fetch("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ destination }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No se pudo calcular la ruta.");
  return payload;
}
