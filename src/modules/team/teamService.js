import { supabase } from "../../supabase/client";

export async function listTeam() {
  const { data, error } = await supabase.from("profiles").select("id, full_name, role, created_at").order("created_at");
  if (error) throw error;
  return data;
}

export async function updateMemberRole(id, role) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}
