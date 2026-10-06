import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // Vercel's Supabase integration provides these server-side build variables.
    // Only the public URL and anonymous/publishable key are embedded in the client.
    __SUPABASE_URL__: JSON.stringify(process.env.SUPABASE_URL ?? ""),
    __SUPABASE_ANON_KEY__: JSON.stringify(
      process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
    ),
  },
});
