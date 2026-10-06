import { supabase } from "../../supabase/client";

export async function listExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, event_id, category, amount, incurred_at, note")
    .order("incurred_at", { ascending: false });
  if (error) throw error;
  return data.map((expense) => ({ ...expense, amount: Number(expense.amount) }));
}

export async function createExpense({ category, amount, date, note, eventId }) {
  const { error } = await supabase.from("expenses").insert({
    category,
    amount,
    incurred_at: date,
    note: note || null,
    event_id: eventId || null,
  });
  if (error) throw error;
}
