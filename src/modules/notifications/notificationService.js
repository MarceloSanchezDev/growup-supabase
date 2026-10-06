import { supabase } from "../../supabase/client";

export async function listNotifications() {
  const { data, error } = await supabase.from("notifications").select("id, message, type, created_at, read_at").order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return data;
}

export async function markNotificationsRead(ids) {
  if (!ids.length) return;
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  if (error) throw error;
}
