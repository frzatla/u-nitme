import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Layers,
  LibraryBig,
  Plus,
  Sparkles,
} from "lucide-react";
import DeletePlanButton from "../../components/DeletePlanButton";
import {
  createNewProfile,
  getProfileByEmail,
  updateProfile,
} from "../../lib/profile";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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
  const orderedPlans = [...plans].reverse();
  const userName = email.split("@")[0];
  const lastPlan = plans[plans.length - 1] ?? null;
  const universityName = lastPlan?.university || "—";
  const lastPlanName = lastPlan?.planName || lastPlan?.courseCode || "—";

  async function handleDeletePlan(formData: FormData) {
    "use server";

    const planId = String(formData.get("planId") || "");
    if (!planId) return;

    const current = await getProfileByEmail(email);
    const currentPlans = current?.plans ?? [];
    const nextPlans = [...currentPlans];
    const planIndex = nextPlans.findIndex((plan) => plan.id === planId);

    if (planIndex === -1) return;

    nextPlans.splice(planIndex, 1);

    await updateProfile(email, { plans: nextPlans });
    revalidatePath("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f5f4ef] font-[var(--font-geist-sans)] text-black">
      <header className="border-b border-black/[0.06] bg-[#f5f4ef]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-4">
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-black/8 bg-white">
              <Image
                src="/U-NIT ME-3.png"
                alt="U-NIT ME logo"
                fill
                sizes="40px"
                className="object-contain"
                priority
              />
            </div>
            <div className="flex items-center gap-3">
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

      <section className="px-6 pb-16 pt-8 md:px-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/45">
              Dashboard
            </p>
            <h1 className="mt-4 text-[36px] font-semibold leading-[0.95] tracking-[-0.07em] text-black md:text-[60px]">
              {getGreeting()},
              <br />
              <span className="text-black/22">{userName}.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-black/45 md:text-base">
              Keep track of saved course plans, revisit the latest version,
              and start a new one when your study direction changes.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-black px-6 py-6 text-white">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
                <Layers className="h-4 w-4" />
                <span>Saved Plans</span>
              </div>
              <div className="mt-7 text-[42px] font-semibold leading-none tracking-[-0.08em]">
                {plans.length}
              </div>
            </div>

            <div className="rounded-[24px] border border-black/[0.08] bg-white px-6 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-black/28">
                <LibraryBig className="h-4 w-4" />
                <span>University</span>
              </div>
              <div className="mt-7 text-[28px] font-medium leading-[1.05] tracking-[-0.05em] text-black">
                {universityName}
              </div>
            </div>

            <div className="rounded-[24px] border border-black/[0.08] bg-white px-6 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-black/28">
                <Calendar className="h-4 w-4" />
                <span>Latest Plan</span>
              </div>
              <div className="mt-7 text-[28px] font-medium leading-[1.05] tracking-[-0.05em] text-black/68">
                {lastPlanName}
              </div>
            </div>
          </div>

          <div className="mt-14 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-black/45">
                Your Plans
              </p>
              <p className="mt-2 text-sm text-black/38">
                Everything you&apos;ve saved, ordered by most recent.
              </p>
            </div>

            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.12] bg-white px-5 py-3 text-sm font-medium text-black transition-colors hover:border-black/20 hover:bg-black/[0.02]"
            >
              <Plus className="h-4 w-4" />
              New Plan
            </Link>
          </div>

          {orderedPlans.length > 0 ? (
            <div className="mt-8 grid gap-4">
              {orderedPlans.map((plan, index) => {
                const start = Number(plan?.yearStart);
                const end = Number(plan?.yearEnd);
                const unitCount =
                  plan.schedule?.summary.total_units ??
                  (Number.isFinite(start) &&
                  Number.isFinite(end) &&
                  end >= start
                    ? (end - start + 1) * 8
                    : 0);
                const totalCredits =
                  plan.schedule?.summary.total_cp ?? unitCount * 6;

                return (
                  <div
                    key={plan.id}
                    className="rounded-[28px] border border-black/[0.08] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h2 className="truncate text-[28px] font-semibold leading-none tracking-[-0.06em] text-black md:text-[34px]">
                            {plan.planName || plan.courseCode || "Course Plan"}
                          </h2>
                          {index === 0 && (
                            <span className="rounded-full bg-black px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">
                              Latest
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2.5">
                          {[
                            plan.courseCode,
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
                                className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-black/55"
                              >
                                {item}
                              </span>
                            ))}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-black/38">
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
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/course-plan/${plan.id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-black/[0.12] bg-white px-5 py-3 text-sm font-medium text-black/68 transition-colors hover:border-black/20 hover:bg-black/[0.02] hover:text-black"
                        >
                          Open Plan
                          <ChevronRight className="h-4 w-4" />
                        </Link>

                        <DeletePlanButton
                          planId={plan.id}
                          action={handleDeletePlan}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-[28px] border border-dashed border-black/[0.1] bg-white px-8 py-16 md:px-12 md:py-20">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[22px] border border-black/[0.08] bg-[#f5f4ef] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <Sparkles className="h-8 w-8 text-black/16" />
                </div>

                <h2 className="mt-8 text-[24px] font-semibold tracking-[-0.05em] text-black">
                  No saved plans yet
                </h2>

                <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-black/35">
                  Generate your first course plan and keep it here for quick
                  access later.
                </p>

                <Link
                  href="/profile"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-black/[0.12] bg-white px-6 py-3 text-sm font-medium text-black/68 transition-colors hover:border-black/20 hover:bg-black/[0.02] hover:text-black"
                >
                  <Plus className="h-4 w-4" />
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
