import { supabase } from "../../supabase/client";

export async function listResources() { const { data, error } = await supabase.from("resources").select("id, name, category, available_quantity").eq("active", true).order("name"); if (error) throw error; return data; }
export async function listStaffMembers() { const { data, error } = await supabase.from("staff_members").select("id, full_name, phone").eq("active", true).order("full_name"); if (error) throw error; return data; }
export async function createResource({ name, category, quantity }) { const { error } = await supabase.from("resources").insert({ name, category: category || null, available_quantity: quantity }); if (error) throw error; }
export async function createStaffMember({ name, phone }) { const { error } = await supabase.from("staff_members").insert({ full_name: name, phone: phone || null }); if (error) throw error; }
