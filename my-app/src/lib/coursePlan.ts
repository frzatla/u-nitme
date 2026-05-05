import { getProfileByEmail } from "@/lib/profile";
import { getPendingPlan } from "@/lib/pendingPlan";
import { Plan } from "@/lib/types";

export async function getCoursePlanById(
  email: string,
  planId: string,
  isPending: boolean,
): Promise<Plan | null> {
  if (isPending) {
    return await getPendingPlan(email);
  }

  const profile = await getProfileByEmail(email);
  return profile?.plans?.find((plan) => plan.id === planId) ?? null;
}

export function buildCoursePlanInfoPills(plan: Plan): string[] {
  if (!plan.schedule) return [];

  return [
    plan.university,
    plan.schedule.course_title,
    plan.schedule.specialisation &&
      `Specialisation: ${plan.schedule.specialisation}`,
    plan.schedule.major && `Major: ${plan.schedule.major}`,
    plan.schedule.minor && `Minor: ${plan.schedule.minor}`,
    plan.interests?.length && `Interests: ${plan.interests.join(", ")}`,
    plan.semesterOffering,
    `${plan.yearStart}-${plan.yearEnd}`,
  ].filter(Boolean) as string[];
}
