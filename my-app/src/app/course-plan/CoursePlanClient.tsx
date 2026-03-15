"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, BookmarkCheck, Loader2, ArrowLeft } from "lucide-react";
import CoursePlanner, { type Semester } from "../../components/CoursePlanner";
import { savePlanWithSchedule } from "../actions";
import { Plan, Schedule, ScheduledUnit } from "@/lib/types";

function buildUnitQueue(schedule: Schedule): Map<string, ScheduledUnit[]> {
  const map = new Map<string, ScheduledUnit[]>();
  schedule.schedule.forEach((sem) => {
    sem.units.forEach((u) => {
      if (!map.has(u.code)) map.set(u.code, []);
      map.get(u.code)!.push({ ...u });
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
  const [plan, setPlan] = useState(initialPlan);

  const [modifiedSemesters, setModifiedSemesters] = useState<Semester[] | null>(
    null,
  );
  const [isSaving, startTransition] = useTransition();

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

  return (
    <>
      <section className="bg-black px-6 py-10 text-white md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {plan.planName}
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
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm text-black/40 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

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
    </>
  );
}
