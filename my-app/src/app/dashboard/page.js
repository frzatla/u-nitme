"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  GraduationCap,
  Calendar,
  BookOpen,
  Trash2,
  ArrowUpRight,
  Sparkles,
  Clock,
  Layers,
} from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return then.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPlanTitle(studentDetails) {
  return (
    studentDetails.planName ||
    studentDetails.degree ||
    studentDetails.major ||
    studentDetails.specialisation ||
    "Untitled Plan"
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [plans, setPlans] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("savedPlans");

    if (!stored) {
      setPlans([]);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setPlans(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPlans([]);
    }
  }, []);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      ),
    [plans],
  );
  const latestPlan = sortedPlans[0] || null;

  const handleDeletePlan = (id) => {
    const updated = plans.filter((plan) => plan.id !== id);
    setPlans(updated);
    localStorage.setItem("savedPlans", JSON.stringify(updated));

    if (localStorage.getItem("currentPlanId") === id) {
      localStorage.removeItem("currentPlanId");
    }

    setDeleteConfirm(null);
  };

  const handleViewPlan = (plan) => {
    localStorage.setItem("studentDetails", JSON.stringify(plan.studentDetails));
    localStorage.setItem("currentPlanId", plan.id);
    router.push("/course-plan");
  };

  const firstName =
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Student";

  return (
    <main className="min-h-screen bg-white text-black">
      <nav className="w-full border-b border-black/[0.06] px-6 py-5 md:px-12">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-md">
              <Image
                src="/U-NIT ME-3.png"
                alt="U-NIT ME logo"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <span className="tracking-tight">U-NIT ME</span>
          </div>

          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <div className="px-6 pb-12 pt-16 md:px-12">
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-black/60">
              Dashboard
            </div>
            <h1 className="mb-3 text-4xl tracking-tighter md:text-5xl">
              {getGreeting()},
              <br />
              <span className="text-black/60">{firstName}.</span>
            </h1>
          </motion.div>
        </div>
      </div>

      <div className="px-6 pb-12 md:px-12">
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            <div className="rounded-2xl bg-black p-6 text-white">
              <div className="mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-white/40" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Saved Plans
                </span>
              </div>
              <div className="text-4xl tracking-tighter md:text-5xl">
                {sortedPlans.length}
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.06] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-black/30" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/25">
                  Latest Plan
                </span>
              </div>
              <div className="text-lg tracking-tight text-black/50 md:text-2xl">
                {latestPlan ? getPlanTitle(latestPlan.studentDetails) : "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.06] p-6">
              <div className="mb-4 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-black/30" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/25">
                  University
                </span>
              </div>
              <div className="text-lg tracking-tight text-black/50 md:text-2xl">
                {latestPlan?.studentDetails?.university || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.06] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-black/30" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/25">
                  Last Saved
                </span>
              </div>
              <div className="text-lg tracking-tight text-black/50">
                {latestPlan ? timeAgo(latestPlan.savedAt) : "—"}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-6 pb-20 md:px-12">
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-8 flex items-center justify-between"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-black/60">
              Your Plans
            </div>
            <button
              onClick={() => router.push("/dashboard/new")}
              className="group flex items-center gap-2.5 rounded-full bg-black px-5 py-2.5 text-sm text-white transition-all hover:bg-black/85"
            >
              <Plus className="h-3.5 w-3.5" />
              New Plan
            </button>
          </motion.div>

          {sortedPlans.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="rounded-2xl border border-dashed border-black/10 p-16 text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-black/[0.06]">
                <Sparkles className="h-7 w-7 text-black/15" />
              </div>
              <h3 className="mb-2 text-xl tracking-tight">
                No saved plans yet
              </h3>
              <p className="mx-auto mb-8 max-w-sm text-sm text-black/30">
                Create your first AI-generated course plan and it&apos;ll show
                up here. Takes about 30 seconds.
              </p>
              <button
                onClick={() => router.push("/dashboard/new")}
                className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm text-white transition-all hover:bg-black/85"
              >
                <Plus className="h-4 w-4" />
                Create First Plan
              </button>
            </motion.div>
          )}

          {sortedPlans.length > 0 && (
            <div className="space-y-3">
              <AnimatePresence>
                {sortedPlans.map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="group rounded-2xl border border-black/[0.06] transition-all duration-500 hover:border-black/15"
                  >
                    <div className="flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleViewPlan(plan)}
                      >
                        <div className="mb-2 flex items-center gap-3">
                          <h3 className="text-lg tracking-tight transition-colors group-hover:text-black">
                            {getPlanTitle(plan.studentDetails)}
                          </h3>

                          {plan.studentDetails.minor && (
                            <span className="rounded-full bg-black/[0.03] px-2 py-0.5 text-xs text-black/25">
                              + {plan.studentDetails.minor}
                            </span>
                          )}

                          {plan.studentDetails.specialisation && (
                            <span className="rounded-full bg-black/[0.03] px-2 py-0.5 text-xs text-black/25">
                              {plan.studentDetails.specialisation}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-black/30">
                          <span>{plan.studentDetails.university}</span>
                          <span className="h-1 w-1 rounded-full bg-black/10" />
                          <span>{plan.studentDetails.faculty}</span>
                          <span className="h-1 w-1 rounded-full bg-black/10" />
                          <span>{plan.studentDetails.semesterOffering}</span>
                          <span className="h-1 w-1 rounded-full bg-black/10" />
                          <span>
                            {plan.studentDetails.yearStart}–
                            {plan.studentDetails.yearEnd}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden items-center gap-6 text-xs text-black/25 md:flex">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3" />
                            <span>{plan.unitCount} units</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-3 w-3" />
                            <span>{plan.totalCredits} CP</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>{timeAgo(plan.savedAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {deleteConfirm === plan.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeletePlan(plan.id)}
                                className="rounded-full border border-red-200 px-3 py-1.5 text-[10px] uppercase tracking-wider text-red-500 transition-colors hover:text-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-full border border-black/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-wider text-black/30 transition-colors hover:text-black"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => setDeleteConfirm(plan.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.06] text-black/20 opacity-0 transition-all duration-300 hover:border-red-200 hover:text-red-500 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleViewPlan(plan)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.06] text-black/20 transition-all duration-300 hover:border-black/20 hover:text-black"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 px-6 pb-4 text-xs text-black/20 md:hidden">
                      <span>{plan.unitCount} units</span>
                      <span className="h-1 w-1 rounded-full bg-black/10" />
                      <span>{plan.totalCredits} CP</span>
                      <span className="h-1 w-1 rounded-full bg-black/10" />
                      <span>{timeAgo(plan.savedAt)}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-black/[0.04] px-6 py-6 md:px-12">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <span className="text-[10px] tracking-wider text-black/60">
            U-NIT ME — Your intelligent course planning assistant
          </span>
          <span className="text-[10px] tracking-wider text-black/60">
            © 2026
          </span>
        </div>
      </footer>
    </main>
  );
}
