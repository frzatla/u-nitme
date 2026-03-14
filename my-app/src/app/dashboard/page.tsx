import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Calendar, Layers, Plus } from "lucide-react";
import { getProfileByEmail } from "../../lib/profile";

function getTimeAgo(dateStr?: string | null) {
  if (!dateStr) return "Not saved yet";

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

  const profile = await getProfileByEmail(email);
  const plan = profile?.plan || null;
  const start = Number(plan?.yearStart);
  const end = Number(plan?.yearEnd);
  const unitCount =
    Number.isFinite(start) && Number.isFinite(end) && end >= start
      ? (end - start + 1) * 8
      : 0;
  const totalCredits = unitCount * 6;

  return (
    <main className="min-h-screen bg-[#f5f5f4] text-black">
      <header className="border-b border-black/10 bg-[#f5f5f4]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
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

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tracking-tight">
                U-NIT ME
              </span>
              <span className="hidden text-sm text-black/30 sm:inline">
                Dashboard
              </span>
            </div>
          </div>

          <UserButton />
        </div>
      </header>

      <section className="px-6 py-12 md:px-8 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-black/28">
                Dashboard
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-black">
                Your Course Plans
              </h1>
              <p className="mt-2 text-base text-black/45">
                Review your latest generated course plan or create a new one.
              </p>
            </div>

            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black/90"
            >
              <Plus className="h-4 w-4" />
              Create New Plan
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl bg-black p-6 text-white">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                <Layers className="h-4 w-4" />
                Saved Plans
              </div>
              <div className="mt-6 text-5xl font-semibold tracking-tight">
                {plan ? 1 : 0}
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white p-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-black/28">
                <BookOpen className="h-4 w-4" />
                Total Units
              </div>
              <div className="mt-6 text-5xl font-semibold tracking-tight text-black">
                {unitCount}
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white p-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-black/28">
                <Calendar className="h-4 w-4" />
                Last Saved
              </div>
              <div className="mt-6 text-2xl font-semibold tracking-tight text-black">
                {getTimeAgo(profile?.updated_at || profile?.created_at || null)}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-black/10 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {plan ? (
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-black/28">
                    Latest Plan
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
                    {plan.specialisation || plan.major || plan.degree || "Course Plan"}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      plan.university,
                      plan.faculty,
                      plan.degree,
                      plan.minor ? `Minor: ${plan.minor}` : null,
                      plan.specialisation
                        ? `Spec: ${plan.specialisation}`
                        : null,
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
                          className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs text-black/55"
                        >
                          {item}
                        </span>
                      ))}
                  </div>
                </div>

                <Link
                  href="/course-plan"
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black/90"
                >
                  View Plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-black">
                  No generated plans yet
                </h2>
                <p className="mt-3 text-sm text-black/45">
                  Fill in the student details form to generate your first course
                  plan.
                </p>
                <Link
                  href="/dashboard/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black/90"
                >
                  <Plus className="h-4 w-4" />
                  Create First Plan
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
