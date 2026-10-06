# Configuración inicial de Supabase

1. En el panel de Supabase, abrir **SQL Editor**.
2. Ejecutar las migraciones en este orden:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_security_and_roles.sql`
3. En **Authentication > Providers**, habilitar el acceso por email y contraseña.
4. Crear la primera cuenta de la dueña desde la pantalla de acceso de GrowUp.
5. Esa primera cuenta debe ejecutar `claim_first_owner()` una sola vez; el próximo cambio de la aplicación agregará ese paso guiado.

No utilizar la clave `service_role` en el navegador ni guardarla en el repositorio.
