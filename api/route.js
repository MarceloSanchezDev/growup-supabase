const defaultOrigin = "Universidad Nacional de Hurlingham, Tte. Origone 151, Villa Tesei, Hurlingham, Buenos Aires, Argentina";

function response(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function hasAuthenticatedUser(request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return false;
  const result = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
  return result.ok;
}

export async function POST(request) {
  if (!(await hasAuthenticatedUser(request))) return response({ error: "Tu sesión no es válida." }, 401);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return response({ error: "Falta configurar GOOGLE_MAPS_API_KEY en Vercel." }, 503);
  const { destination } = await request.json().catch(() => ({}));
  if (typeof destination !== "string" || destination.trim().length < 4 || destination.length > 300) return response({ error: "Ingresá una dirección o localidad válida." }, 400);

  const origin = process.env.ROUTE_ORIGIN_ADDRESS || defaultOrigin;
  const googleResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination.trim() },
      travelMode: "DRIVE",
      languageCode: "es-AR",
      regionCode: "AR",
      units: "METRIC",
    }),
  });
  const payload = await googleResponse.json().catch(() => ({}));
  if (!googleResponse.ok || !payload.routes?.[0]) return response({ error: "No fue posible calcular la ruta para esa ubicación." }, 422);
  const route = payload.routes[0];
  return response({
    origin,
    distanceMeters: route.distanceMeters,
    durationSeconds: Number(String(route.duration ?? "0s").replace("s", "")),
    toll: null,
  });
}
