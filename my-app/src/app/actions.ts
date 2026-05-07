"use server";
import { getProfileByEmail, updateProfile } from "@/lib/profile";
import {
  deletePendingPlan,
  getPendingPlan,
  savePendingPlan,
} from "@/lib/pendingPlan";
import { Plan, Schedule } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function renamePlan(
  email: string,
  planId: string,
  planName: string,
  isPending = false,
) {
  const nextName = planName.trim();
  if (!email || !planId || !nextName) return;

  if (isPending) {
    const pendingPlan = await getPendingPlan(email);
    if (!pendingPlan || pendingPlan.id !== planId) return;

    await savePendingPlan(email, { ...pendingPlan, planName: nextName });
  } else {
    const profile = await getProfileByEmail(email);
    const plans: Plan[] = profile?.plans ?? [];
    let changed = false;

    const updatedPlans = plans.map((plan) => {
      if (plan.id !== planId) return plan;
      changed = true;
      return { ...plan, planName: nextName };
    });

    if (!changed) return;
    await updateProfile(email, { plans: updatedPlans });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/course-plan/${planId}`);
}

export async function savePlanWithSchedule(
  email: string,
  planId: string,
  updatedSchedule: Schedule,
) {
  const profile = await getProfileByEmail(email);
  const plans: Plan[] = profile?.plans ?? [];

  // Check if plan already exists in saved plans
  const existingPlan = plans.find((p) => p.id === planId);

  if (existingPlan) {
    // Update existing saved plan
    const updated = plans.map((p) =>
      p.id === planId ? { ...p, saved: true, schedule: updatedSchedule } : p,
    );
    await updateProfile(email, { plans: updated });
  } else {
    // It's a pending plan — copy it with a fresh ID
    const pendingPlan = await getPendingPlan(email);
    if (!pendingPlan) redirect("/profile");

    const savedPlan: Plan = {
      ...pendingPlan,
      id: crypto.randomUUID(),
      saved: true,
      schedule: updatedSchedule,
    };

    await updateProfile(email, { plans: [...plans, savedPlan] });
    await deletePendingPlan(email);
  }

  redirect("/dashboard");
}
