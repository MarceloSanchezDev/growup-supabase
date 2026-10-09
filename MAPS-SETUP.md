# Rutas desde UNAHUR

La aplicación calcula distancia y duración desde la sede Origone de UNAHUR (Tte. Origone 151, Villa Tesei). Se puede reemplazar el origen con `ROUTE_ORIGIN_ADDRESS` en Vercel.

## Configuración en Vercel

1. Crear un proyecto en Google Cloud, asociar facturación y habilitar **Routes API**.
2. Crear una clave restringida para Routes API y guardarla en Vercel como `GOOGLE_MAPS_API_KEY` para Production y Preview.
3. Opcionalmente guardar `ROUTE_ORIGIN_ADDRESS` si deben salir desde otra sede.

La clave nunca debe agregarse al repositorio ni a variables `VITE_`. La función `/api/route` la usa del lado del servidor y solo admite solicitudes de usuarios autenticados.

El cálculo devuelve distancia, tiempo y peajes estimados cuando Google disponga de ese dato. El costo interno de viaje queda editable y se precarga en $90.300; no se calcula automáticamente a partir de los peajes.
