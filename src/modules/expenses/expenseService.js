import { supabase } from "../../supabase/client";

export async function listExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, category, amount, incurred_at, note")
    .order("incurred_at", { ascending: false });
  if (error) throw error;
  return data.map((expense) => ({ ...expense, amount: Number(expense.amount) }));
}

export async function createExpense({ category, amount, date, note }) {
  const { error } = await supabase.from("expenses").insert({
    category,
    amount,
    incurred_at: date,
    note: note || null,
  });
  if (error) throw error;
}
