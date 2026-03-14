import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Layers,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  createNewProfile,
  getProfileByEmail,
} from "../../lib/profile";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getTimeAgo(dateStr?: string | null) {
  if (!dateStr) return "—";

  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMins = Math.floor((now - then) / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) {
    redirect("/sign-in");
  }

  if (email) {
    try {
      const existing = await getProfileByEmail(email);
      if (!existing) {
        await createNewProfile(email);
      }
    } catch {}
  }

  const profile = await getProfileByEmail(email);
  const plans = profile?.plans ?? [];
  const userName = email.split("@")[0];
  const lastSaved = getTimeAgo(
    profile?.updated_at || profile?.created_at || null,
  );
  const totalUnits = plans.reduce((sum, plan) => {
    const start = Number(plan?.yearStart);
    const end = Number(plan?.yearEnd);
    const unitCount =
      Number.isFinite(start) && Number.isFinite(end) && end >= start
        ? (end - start + 1) * 8
        : 0;

    return sum + unitCount;
  }, 0);
  const totalCredits = totalUnits * 6;

  return (
    <main className="min-h-screen bg-white font-[var(--font-geist-sans)] text-black">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-6 md:px-10">
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
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium tracking-tight">
                U-NIT ME
              </span>
              <span className="hidden text-sm text-black/25 sm:inline">
                Dashboard
              </span>
            </div>
          </div>

          <UserButton />
        </div>
      </header>

      <section className="px-6 pb-20 pt-10 md:px-10 md:pt-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-14">
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/60">
              Dashboard
            </p>
            <h1 className="mt-4 text-[44px] font-semibold leading-[0.94] tracking-[-0.07em] text-black md:text-[74px]">
              {getGreeting()},
              <br />
              <span className="text-black/18">{userName}.</span>
            </h1>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] bg-black px-8 py-7 text-white">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-white/35">
                <Layers className="h-5 w-5" />
                <span>Saved Plans</span>
              </div>
              <div className="mt-8 text-[56px] font-semibold leading-none tracking-[-0.08em]">
                {plans.length}
              </div>
            </div>

            <div className="rounded-[24px] border border-black/[0.08] bg-white px-8 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-black/22">
                <BookOpen className="h-5 w-5" />
                <span>Total Units</span>
              </div>
              <div className="mt-8 text-[56px] font-semibold leading-none tracking-[-0.08em] text-black">
                {totalUnits}
              </div>
            </div>

            <div className="rounded-[24px] border border-black/[0.08] bg-white px-8 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-black/22">
                <GraduationCap className="h-5 w-5" />
                <span>Total Credits</span>
              </div>
              <div className="mt-8 text-[56px] font-semibold leading-none tracking-[-0.08em] text-black">
                {totalCredits}
                <span className="ml-1 text-[20px] text-black/15">CP</span>
              </div>
            </div>

            <div className="rounded-[24px] border border-black/[0.08] bg-white px-8 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-black/22">
                <Clock className="h-5 w-5" />
                <span>Last Saved</span>
              </div>
              <div className="mt-8 text-[34px] font-medium leading-[1] tracking-[-0.05em] text-black/42">
                {lastSaved}
              </div>
            </div>
          </div>

          <div className="mt-16 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/60">
              Your Plans
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-3 rounded-full border border-black/[0.12] bg-white px-8 py-4 text-[15px] font-medium text-black transition-colors hover:border-black/20 hover:bg-black/[0.02]"
            >
              <Plus className="h-5 w-5" />
              New Plan
            </Link>
          </div>

          {plans.length > 0 ? (
            <div className="mt-8 space-y-6">
              {plans.map((plan, index) => {
                const start = Number(plan?.yearStart);
                const end = Number(plan?.yearEnd);
                const unitCount =
                  Number.isFinite(start) && Number.isFinite(end) && end >= start
                    ? (end - start + 1) * 8
                    : 0;
                const totalCredits = unitCount * 6;

                return (
                  <div
                    key={`${plan.planName || plan.courses || "plan"}-${index}`}
                    className="rounded-[28px] border border-black/[0.08] bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h2 className="text-[42px] font-semibold leading-none tracking-[-0.06em] text-black">
                          {plan.planName || plan.courses || "Course Plan"}
                        </h2>

                        <div className="mt-5 flex flex-wrap gap-3">
                          {[
                            plan.planName,
                            plan.courses,
                            plan.university,
                            plan.areaOfStudy,
                            plan.semesterOffering,
                            plan.yearStart && plan.yearEnd
                              ? `${plan.yearStart}-${plan.yearEnd}`
                              : null,
                            totalCredits ? `${totalCredits} CP` : null,
                          ]
                            .filter(Boolean)
                            .map((item) => (
                              <span
                                key={item}
                                className="rounded-full bg-black/[0.04] px-4 py-2 text-sm text-black/52"
                              >
                                {item}
                              </span>
                            ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-6 lg:items-end">
                        <div className="flex items-center gap-6 text-sm text-black/26">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>{unitCount} units</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {plan.yearStart}-{plan.yearEnd}
                            </span>
                          </div>
                        </div>

                        <Link
                          href="/course-plan"
                          className="inline-flex items-center gap-3 rounded-full border border-black/[0.1] bg-white px-8 py-4 text-[15px] font-medium text-black transition-colors hover:border-black/20 hover:bg-black/[0.02]"
                        >
                          View Plan
                          <ArrowRight className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-[28px] border border-dashed border-black/[0.1] bg-white px-8 py-20 md:px-12 md:py-24">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[26px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <Sparkles className="h-9 w-9 text-black/14" />
                </div>

                <h2 className="mt-10 text-[26px] font-semibold tracking-[-0.05em] text-black">
                  No saved plans yet
                </h2>

                <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-black/26">
                  Create your first AI-generated course plan and it&apos;ll show
                  up here. Takes about 30 seconds.
                </p>

                <Link
                  href="/dashboard/profile"
                  className="mt-12 inline-flex items-center gap-3 rounded-full bg-black px-8 py-4 text-[15px] font-medium text-white transition-colors hover:bg-black/90"
                >
                  <Plus className="h-5 w-5" />
                  Create First Plan
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
