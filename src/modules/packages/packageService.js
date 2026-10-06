import { supabase } from "../../supabase/client";

export async function listPackages() {
  const { data, error } = await supabase.from("packages").select("id, name, base_price").eq("active", true).order("name");
  if (error) throw error;
  return data.map((item) => ({ ...item, base_price: Number(item.base_price) }));
}

export async function createPackage(name, basePrice) {
  const { error } = await supabase.from("packages").insert({ name, base_price: basePrice });
  if (error) throw error;
}
