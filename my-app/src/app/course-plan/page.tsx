import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, RefreshCw, Save, Sparkles, BookmarkCheck } from "lucide-react";
import { redirect } from "next/navigation";
import CoursePlanner from "../../components/CoursePlanner";
import { getProfileByEmail, updateProfile } from "../../lib/profile";
import { Plan, Profile } from "@/lib/types";

export default async function CoursePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>;
}) {
  const { planId } = await searchParams;
  const user = await currentUser();
  const email: string = user?.primaryEmailAddress?.emailAddress;

  if (!email) redirect("/sign-in");

  const profile: Profile = await getProfileByEmail(email);
  const plans: Plan[] = profile?.plans ?? [];

  // Find by planId from URL, or fall back to most recent plan
  const plan = plans.find((p) => p.id === planId) ?? plans[plans.length - 1];

  if (!plan) redirect("/profile");
  if (!plan.schedule) redirect("/profile");

  async function handleSave() {
    "use server";
    const updated = plans.map((p) =>
      p.id === plan.id ? { ...p, saved: true } : p
    );
    await updateProfile(email, { plans: updated });
    redirect("/dashboard");
  }
  
  const coursePlanName = plan.planName;

  const infoPills = [
    plan.university,
    plan.schedule.course_title,
    plan.schedule.specialisation,
    plan.schedule.major,
    plan.schedule.minor,
    plan.semesterOffering,
    `${plan.yearStart}-${plan.yearEnd}`,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f5f5f2] text-black">
      <header className="border-b border-black/10 bg-[#f5f5f2]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
              <Image
                src="/U-NIT ME-3.png"
                alt="U-NIT ME logo"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <span className="text-sm font-medium tracking-tight">U-NIT ME</span>
          </div>
          <UserButton />
        </div>
      </header>

      <section className="bg-black px-6 py-10 text-white md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-white/50" />
                <span className="text-xs text-white/50">AI Generated</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {coursePlanName}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {infoPills.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs text-white/60"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-white/60 px-4 py-2 text-xs text-white/80 transition-all hover:border-white/30 hover:text-white"
              >
                <Save className="h-3.5 w-3.5" />
                Save Plan
              </button>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-white/50 transition-all hover:border-white/30 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Link>

              {!plan.saved && (
                <form action={handleSave}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-medium text-black transition-all hover:bg-white/90"
                  >
                    <BookmarkCheck className="h-3.5 w-3.5" />
                    Save Plan
                  </button>
                </form>
              )}

              {plan.saved && (
                <span className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-white/40">
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 md:px-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm text-black/40 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <CoursePlanner
            schedule={plan.schedule}
            studentDetails={{
              planName: plan.planName,
              university: plan.university,
              yearStart: plan.yearStart,
              yearEnd: plan.yearEnd,
            }}
            showHeader={false}
          />
        </div>
      </section>

      <footer className="border-t border-black/10 px-6 py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-xs text-black/25">
            Generated by U-NIT ME — always verify with your university&apos;s
            official handbook
          </p>
          <p className="text-xs text-black/20">
            {plan.semesterOffering} • {plan.yearStart}–{plan.yearEnd}
          </p>
        </div>
      </footer>
    </main>
  );
}
