"use server";

import { getProfileByEmail, updateProfile } from "@/lib/profile";
import { Plan, Schedule } from "@/lib/types";
import { redirect } from "next/navigation";

export async function savePlanWithSchedule(
  email: string,
  planId: string,
  updatedSchedule: Schedule
) {
  const profile = await getProfileByEmail(email);
  const plans: Plan[] = profile?.plans ?? [];

  const updated = plans.map((p) =>
    p.id === planId ? { ...p, saved: true, schedule: updatedSchedule } : p
  );

  await updateProfile(email, { plans: updated });
  redirect("/dashboard");
}
