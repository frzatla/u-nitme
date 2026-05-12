"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  BookmarkCheck,
  Loader2,
  ArrowLeft,
  Download,
  GraduationCap,
  X,
  Award,
  BookOpen,
  Target,
  GitBranch,
  LayoutGrid,
} from "lucide-react";
import CoursePlanner, { type Semester } from "../../components/CoursePlanner";
import FloatingChatbot from "../../components/FloatingChatbot";
import PlanNameEditor from "../../components/PlanNameEditor";
import { savePlanWithSchedule } from "../actions";
import { Plan, Schedule, ScheduledUnit } from "@/lib/types";

function buildUnitQueue(schedule: Schedule): Map<string, ScheduledUnit[]> {
  const map = new Map<string, ScheduledUnit[]>();
  schedule.schedule.forEach((sem) => {
    sem.units.forEach((u) => {
      if (!map.has(u.code)) map.set(u.code, []);
      const unit = { ...u };
      delete unit.difficulty_score;
      delete unit.difficulty_level;
      map.get(u.code)!.push(unit);
    });
  });
  return map;
}

function rebuildSchedule(
  originalSchedule: Schedule,
  updatedSemesters: Semester[],
): Schedule {
  const queue = buildUnitQueue(originalSchedule);

  const newSchedule = originalSchedule.schedule.map((origSem) => {
    if (origSem.period === null) return origSem;

    const updatedSem = updatedSemesters.find((s) => s.id === origSem.semester);
    if (!updatedSem) return origSem;

    const newUnits: ScheduledUnit[] = updatedSem.units
      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
      .map((slot) => {
        const pool = queue.get(slot.code);
        if (pool && pool.length > 0) return pool.shift()!;
        return {
          code: slot.code,
          title: slot.name,
          credit_points: slot.cp,
          level:
            slot.level !== "—" ? parseInt(slot.level.replace("L", "")) : null,
          chain_length: null,
          extended: null,
          category: slot.category,
        };
      });

    const total_cp = newUnits.reduce((s, u) => s + u.credit_points, 0);
    return { ...origSem, units: newUnits, total_cp };
  });

  return { ...originalSchedule, schedule: newSchedule };
}

type Props = {
  plan: Plan;
  email: string;
  infoPills: string[];
  isPending: boolean;
  handleSave: () => Promise<void>;
  handleDiscard: () => Promise<void>;
};

export default function CoursePlanClient({
  plan: initialPlan,
  email,
  infoPills,
  isPending: isNewPlan,
  handleSave,
  handleDiscard,
}: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);

  const [modifiedSemesters, setModifiedSemesters] = useState<Semester[] | null>(
    null,
  );
  const [isSaving, startTransition] = useTransition();
  const [validateModalOpen, setValidateModalOpen] = useState(false);
  const [mockPass, setMockPass] = useState(false);

  function onSave() {
    const updatedSchedule = modifiedSemesters
      ? rebuildSchedule(plan.schedule!, modifiedSemesters)
      : plan.schedule!;

    startTransition(async () => {
      await savePlanWithSchedule(email, plan.id, updatedSchedule);
    });
  }

  function onDiscard() {
    startTransition(async () => {
      await handleDiscard();
    });
  }

  function onBackToDashboard() {
    const shouldConfirm = isNewPlan || !plan.saved;
    if (!shouldConfirm) {
      router.push("/dashboard");
      return;
    }

    const message = isNewPlan
      ? "This plan has not been saved yet. Do you want to leave and go back to the dashboard?"
      : "You have unsaved changes to this plan. Do you want to leave and go back to the dashboard?";

    if (window.confirm(message)) {
      router.push("/dashboard");
    }
  }
  const exportHref = isNewPlan
    ? `/course-plan/${plan.id}/pdf?pending=true`
    : `/course-plan/${plan.id}/pdf`;
  const chatbotContext = [
    "Page: course plan",
    `Plan name: ${plan.planName || "Course Plan"}`,
    `Course code: ${plan.courseCode || "Unknown"}`,
    `University: ${plan.university || "Unknown"}`,
    `Area of study: ${plan.areaOfStudy || "Unknown"}`,
    `Timeline: ${plan.semesterOffering || "Unknown"} ${plan.yearStart || "?"}-${plan.yearEnd || "?"}`,
    `Status: ${plan.saved ? "saved" : "unsaved"}`,
    `Summary: ${plan.schedule?.summary.total_units ?? 0} units, ${plan.schedule?.summary.total_cp ?? 0} credit points`,
  ].join("\n");

  return (
    <>
      <section className="bg-black px-6 py-10 text-white md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <PlanNameEditor
                email={email}
                planId={plan.id}
                initialName={plan.planName || ""}
                fallbackName={plan.courseCode || "Course Plan"}
                isPending={isNewPlan}
                variant="planner"
                headingLevel="h1"
                onRenamed={(nextName) =>
                  setPlan((current) => ({ ...current, planName: nextName }))
                }
              />
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
                onClick={() => setValidateModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-white/20"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Validate Plan
              </button>
              <Link
                href={exportHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-white/50 transition-all hover:border-white/30 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Export PDF
              </Link>

              {isNewPlan ? (
                <>
                  <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-medium text-black transition-all hover:bg-white/90 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <BookmarkCheck className="h-3.5 w-3.5" />
                    )}
                    Save Plan
                  </button>
                  <button
                    onClick={onDiscard}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-white/50 transition-all hover:border-white/30 hover:text-white disabled:opacity-60"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                </>
              ) : (
                <>
                  {!plan.saved ? (
                    <button
                      onClick={onSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-medium text-black transition-all hover:bg-white/90 disabled:opacity-60"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <BookmarkCheck className="h-3.5 w-3.5" />
                      )}
                      Save Plan
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-white/40">
                      <BookmarkCheck className="h-3.5 w-3.5" />
                      Saved
                    </span>
                  )}
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-white/50 transition-all hover:border-white/30 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 md:px-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="mb-6 inline-flex items-center gap-2 text-sm text-black/40 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <CoursePlanner
            schedule={plan.schedule!}
            studentDetails={{
              planName: plan.planName,
              university: plan.university,
              yearStart: plan.yearStart,
              yearEnd: plan.yearEnd,
            }}
            showHeader={false}
            onSemestersChange={(semesters) => {
              setModifiedSemesters(semesters);
              setPlan((plan) => ({ ...plan, saved: false }));
            }}
          />
        </div>
      </section>
      <FloatingChatbot context={chatbotContext} />

      {/* Validate Plan modal */}
      {validateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setValidateModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — colour signals pass/fail immediately */}
            <div className={`flex items-center justify-between px-5 py-4 ${mockPass ? "bg-emerald-600" : "bg-red-500"}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                    Plan Validation
                  </p>
                  <p className="text-[12px] text-white/70">
                    {mockPass ? "All requirements satisfied" : "Some requirements not met"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setValidateModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            {/* Checklist — TODO: replace mock checks with real graduation requirement logic */}
            <div className="divide-y divide-black/[0.06] px-5">
              {[
                { label: "Minimum credit points met",        Icon: Award      },
                { label: "Core units all scheduled",         Icon: BookOpen   },
                { label: "Specialisation requirements covered", Icon: Target  },
                { label: "No prerequisite conflicts detected",  Icon: GitBranch },
                { label: "Elective slots filled",            Icon: LayoutGrid },
              ].map(({ label, Icon }) => (
                <div key={label} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${mockPass ? "text-emerald-500" : "text-red-400"}`} />
                    <span className="text-[13px] text-black/60">{label}</span>
                  </div>
                  {mockPass ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-600">Pass</span>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-red-500">Fail</span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-black/[0.06] px-5 py-4">
              <div className="flex items-center justify-between">
                <p className={`text-[13px] font-medium ${mockPass ? "text-emerald-600" : "text-red-500"}`}>
                  {mockPass ? "✓ On track to graduate" : "✗ Requirements not met"}
                </p>
                <button
                  onClick={() => setValidateModalOpen(false)}
                  className="rounded-xl bg-black px-4 py-2 text-[13px] font-medium text-white transition hover:bg-black/80"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
