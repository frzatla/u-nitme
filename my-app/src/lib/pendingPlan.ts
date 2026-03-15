import { supabase } from "./supabase";
import { PendingPlan, Plan } from "./types";

const PENDING_TABLE = "pendingPlan";

export async function savePendingPlan(email: string, plan: Plan) {
  await supabase.from(PENDING_TABLE).delete().eq("email", email);

  const payload: PendingPlan = { email, plan };

  const { data, error } = await supabase
    .from(PENDING_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as PendingPlan;
}

export async function getPendingPlan(email: string): Promise<Plan | null> {
  const { data, error } = await supabase
    .from(PENDING_TABLE)
    .select("plan")
    .eq("email", email)
    .single();

  if (error) return null;
  return data?.plan as Plan;
}

export async function deletePendingPlan(email: string) {
  const { error } = await supabase
    .from(PENDING_TABLE)
    .delete()
    .eq("email", email);

  if (error) throw error;
}
