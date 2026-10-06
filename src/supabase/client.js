import { createClient } from "@supabase/supabase-js";

// Local development uses VITE_* variables. Vercel deployments use the values
// synchronized by its Supabase integration during the build.
const url = import.meta.env.VITE_SUPABASE_URL || __SUPABASE_URL__;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || __SUPABASE_ANON_KEY__;

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
