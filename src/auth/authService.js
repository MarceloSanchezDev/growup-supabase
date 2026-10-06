import { supabase } from "../supabase/client";

export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error("Supabase todavía no está configurado.");
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email, password, fullName) {
  if (!supabase) throw new Error("Supabase todavía no está configurado.");
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin,
    },
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentProfile() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("profiles").select("id, full_name, role").eq("id", user.id).single();
  if (error) throw error;
  return data;
}
