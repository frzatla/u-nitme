"use client";

import { FormEvent, useRef, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkCheck,
  Loader2,
  ArrowLeft,
  Download,
  GraduationCap,
  Award,
  BookOpen,
  Target,
  GitBranch,
  LayoutGrid,
  Pencil,
  Sparkles,
  X,
  ChevronDown,
} from "lucide-react";
import CoursePlanner, { type Semester } from "../../components/CoursePlanner";
import FloatingChatbot from "../../components/FloatingChatbot";
import PlanNameEditor from "../../components/PlanNameEditor";
import { regeneratePlanWithDetails, savePlanWithSchedule } from "../actions";
import { Plan, Schedule, ScheduledUnit } from "@/lib/types";
import type { CoursePlanOptions } from "@/lib/courseOptions";

const NO_AREA_OF_STUDY_VALUE = "__NO_AREA_OF_STUDY__";

const interestOptions = [
  "AI",
  "Problem Solving",
  "Cybersecurity",
  "Data",
  "Software",
  "Design",
  "Business",
  "Pitching",
  "Leadership",
  "Communication",
  "Finance",
  "Health",
  "Sustainability",
  "Robotics",
  "Games",
  "Education",
];

function getMaxInterests(minorMajorType: string) {
  if (minorMajorType === "major") return 1;
  if (minorMajorType === "minor") return 2;
  return 3;
}

function clampEndYear(nextStart: string, nextEnd: string) {
  if (!nextEnd) return "";

  const start = Number(nextStart);
  const end = Number(nextEnd);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return nextEnd;
  if (end < start + 2) return String(start + 2);
  if (end > start + 7) return String(start + 7);
  return nextEnd;
}

// ── Custom dark-themed select (native selects render white dropdowns on Windows) ──

type SelectOption = { value: string; label: string };

function DarkSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/12 bg-white/[0.08] px-3 py-2 text-xs text-left outline-none transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "text-white truncate" : "text-white/35 truncate"}>
          {selected ? selected.label : (placeholder ?? "Select...")}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-white/15 bg-[#1e1e2e] shadow-xl">
          <div className="max-h-56 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-xs transition hover:bg-white/10 ${
                  opt.value === value ? "bg-white/15 text-white" : "text-white/65"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-white/12 bg-white/[0.08] px-3 py-2 text-xs text-white outline-none transition focus:border-white/30 focus:bg-white/[0.12]";

const labelClass =
  "mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-white/35";

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
  coursePlanOptions: CoursePlanOptions;
  isPending: boolean;
  handleSave: () => Promise<void>;
};

export default function CoursePlanClient({
  plan: initialPlan,
  email,
  infoPills,
  coursePlanOptions,
  isPending: isNewPlan,
  handleSave,
}: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [modifiedSemesters, setModifiedSemesters] = useState<Semester[] | null>(
    null,
  );
  const [isSaving, startTransition] = useTransition();
  const [validateModalOpen, setValidateModalOpen] = useState(false);
  const [mockPass, setMockPass] = useState(true);
  const [isRegenerating, startRegenerateTransition] = useTransition();
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [details, setDetails] = useState(() => ({
    courseCode: initialPlan.courseCode || "",
    university: initialPlan.university || "Monash University",
    areaOfStudy: initialPlan.areaOfStudy || "",
    minorMajorType: initialPlan.schedule?.major
      ? "major"
      : initialPlan.schedule?.minor
        ? "minor"
        : "",
    minorMajorCode:
      initialPlan.schedule?.major || initialPlan.schedule?.minor || "",
    interests: initialPlan.interests ?? [],
    semesterOffering: initialPlan.semesterOffering || "February",
    yearStart: String(initialPlan.yearStart || ""),
    yearEnd: String(initialPlan.yearEnd || ""),
  }));

  const filteredAos = useMemo(() => {
    if (
      !details.courseCode ||
      !coursePlanOptions.courseToAos[details.courseCode]
    ) {
      return [];
    }

    return coursePlanOptions.aosList.filter((aos) =>
      coursePlanOptions.courseToAos[details.courseCode].includes(aos.code),
    );
  }, [
    coursePlanOptions.aosList,
    coursePlanOptions.courseToAos,
    details.courseCode,
  ]);

  const areaOfStudyOptions =
    details.courseCode && filteredAos.length === 0
      ? [{ code: NO_AREA_OF_STUDY_VALUE, title: "No area of study" }]
      : filteredAos;
  const areaOfStudyValue =
    details.courseCode && filteredAos.length === 0
      ? NO_AREA_OF_STUDY_VALUE
      : details.areaOfStudy;
  const minorMajorOptions =
    details.minorMajorType === "minor"
      ? coursePlanOptions.minorAosList
      : details.minorMajorType === "major"
        ? coursePlanOptions.majorAosList
        : [];
  const maxInterests = getMaxInterests(details.minorMajorType);

  function onSave() {
    const updatedSchedule = modifiedSemesters
      ? rebuildSchedule(plan.schedule!, modifiedSemesters)
      : plan.schedule!;

    startTransition(async () => {
      await savePlanWithSchedule(email, plan.id, updatedSchedule);
    });
  }

  function onDiscard() {
    setIsEditingDetails(false);
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

  function toggleInterest(interest: string) {
    setDetails((current) => {
      if (current.interests.includes(interest)) {
        return {
          ...current,
          interests: current.interests.filter((item) => item !== interest),
        };
      }

      if (current.interests.length >= maxInterests) return current;
      return { ...current, interests: [...current.interests, interest] };
    });
  }

  function onApplyDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (modifiedSemesters) {
      const confirmed = window.confirm(
        "Regenerating from these details will replace your current semester edits. Continue?",
      );
      if (!confirmed) return;
    }

    startRegenerateTransition(async () => {
      await regeneratePlanWithDetails(
        email,
        plan.id,
        {
          planName: plan.planName || "Course Plan",
          courseCode: details.courseCode,
          university: details.university,
          areaOfStudy:
            areaOfStudyValue === NO_AREA_OF_STUDY_VALUE ? "" : areaOfStudyValue,
          interests: details.interests,
          semesterOffering: details.semesterOffering,
          yearStart: Number(details.yearStart),
          yearEnd: Number(details.yearEnd),
          minorMajorType: details.minorMajorType,
          minorMajorCode: details.minorMajorCode,
        },
        isNewPlan,
      );
    });
  }

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
                onRenamed={(nextName) => {
                  setPlan((current) => ({ ...current, planName: nextName }));
                }}
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
                    onClick={() => setIsEditingDetails((current) => !current)}
                    disabled={isSaving || isRegenerating}
                    className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-white/50 transition-all hover:border-white/30 hover:text-white disabled:opacity-60"
                  >
                    {isEditingDetails ? (
                      <X className="h-3.5 w-3.5" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                    {isEditingDetails ? "Close" : "Edit Details"}
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
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails((current) => !current)}
                    disabled={isSaving || isRegenerating}
                    className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-white/50 transition-all hover:border-white/30 hover:text-white"
                  >
                    {isEditingDetails ? (
                      <X className="h-3.5 w-3.5" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                    {isEditingDetails ? "Close" : "Edit Details"}
                  </button>
                </>
              )}
            </div>
          </div>

          {isEditingDetails && (
            <form
              onSubmit={onApplyDetails}
              className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-4 md:p-5"
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label htmlFor="edit-university" className={labelClass}>
                    University
                  </label>
                  <DarkSelect
                    id="edit-university"
                    value={details.university}
                    onChange={(value) => setDetails((c) => ({ ...c, university: value }))}
                    options={[{ value: "Monash University", label: "Monash University" }]}
                  />
                </div>

                <div>
                  <label htmlFor="edit-course" className={labelClass}>
                    Course
                  </label>
                  <DarkSelect
                    id="edit-course"
                    value={details.courseCode}
                    onChange={(nextCourse) => {
                      const nextAosCodes = coursePlanOptions.courseToAos[nextCourse] ?? [];
                      setDetails((c) => ({
                        ...c,
                        courseCode: nextCourse,
                        areaOfStudy: nextAosCodes.length === 0 ? NO_AREA_OF_STUDY_VALUE : "",
                      }));
                    }}
                    placeholder="Select course"
                    options={coursePlanOptions.courses.map((c) => ({
                      value: c.code,
                      label: `${c.code}: ${c.title}`,
                    }))}
                  />
                </div>

                <div>
                  <label htmlFor="edit-aos" className={labelClass}>
                    Area of Study
                  </label>
                  <DarkSelect
                    id="edit-aos"
                    value={areaOfStudyValue ?? ""}
                    onChange={(value) => setDetails((c) => ({ ...c, areaOfStudy: value }))}
                    placeholder={details.courseCode ? "Select area of study" : "Select course first"}
                    disabled={!details.courseCode}
                    options={areaOfStudyOptions.map((a) => ({
                      value: a.code,
                      label: `${a.code}: ${a.title}`,
                    }))}
                  />
                </div>

                <div>
                  <label htmlFor="edit-offering" className={labelClass}>
                    Offering
                  </label>
                  <DarkSelect
                    id="edit-offering"
                    value={details.semesterOffering}
                    onChange={(value) => setDetails((c) => ({ ...c, semesterOffering: value }))}
                    options={[{ value: "February", label: "February" }]}
                  />
                </div>

                <div>
                  <label htmlFor="edit-minor-major-type" className={labelClass}>
                    Minor / Major
                  </label>
                  <DarkSelect
                    id="edit-minor-major-type"
                    value={details.minorMajorType}
                    onChange={(nextType) => {
                      const nextMax = getMaxInterests(nextType);
                      setDetails((c) => ({
                        ...c,
                        minorMajorType: nextType,
                        minorMajorCode: "",
                        interests: c.interests.length > nextMax ? c.interests.slice(0, nextMax) : c.interests,
                      }));
                    }}
                    options={[
                      { value: "", label: "None" },
                      { value: "major", label: "Major" },
                      { value: "minor", label: "Minor" },
                    ]}
                  />
                </div>

                <div>
                  <label htmlFor="edit-minor-major-code" className={labelClass}>
                    Select{" "}
                    {details.minorMajorType === "major"
                      ? "Major"
                      : details.minorMajorType === "minor"
                        ? "Minor"
                        : "Option"}
                  </label>
                  <DarkSelect
                    id="edit-minor-major-code"
                    value={details.minorMajorCode}
                    onChange={(value) => setDetails((c) => ({ ...c, minorMajorCode: value }))}
                    placeholder={details.minorMajorType ? "Select option" : "None"}
                    disabled={!details.minorMajorType}
                    options={minorMajorOptions.map((o) => ({
                      value: o.code,
                      label: `${o.code}: ${o.title}`,
                    }))}
                  />
                </div>

                <div>
                  <label htmlFor="edit-start-year" className={labelClass}>
                    Start Year
                  </label>
                  <input
                    id="edit-start-year"
                    type="number"
                    min="2020"
                    max="2035"
                    value={details.yearStart}
                    onChange={(event) => {
                      const nextStart = event.target.value;
                      setDetails((current) => ({
                        ...current,
                        yearStart: nextStart,
                        yearEnd: clampEndYear(nextStart, current.yearEnd),
                      }));
                    }}
                    className={fieldClass}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-end-year" className={labelClass}>
                    End Year
                  </label>
                  <input
                    id="edit-end-year"
                    type="number"
                    min={
                      details.yearStart
                        ? String(Number(details.yearStart) + 2)
                        : "2022"
                    }
                    max={
                      details.yearStart
                        ? String(Number(details.yearStart) + 7)
                        : "2040"
                    }
                    value={details.yearEnd}
                    onChange={(event) =>
                      setDetails((current) => ({
                        ...current,
                        yearEnd: clampEndYear(
                          current.yearStart,
                          event.target.value,
                        ),
                      }))
                    }
                    className={fieldClass}
                    required
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <p className={labelClass}>Interests</p>
                  <span className="text-xs text-white/35">
                    {details.interests.length}/{maxInterests} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((interest) => {
                    const isSelected = details.interests.includes(interest);
                    const isDisabled =
                      !isSelected && details.interests.length >= maxInterests;

                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        disabled={isDisabled}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          isSelected
                            ? "border-white bg-white text-black"
                            : "border-white/12 bg-white/[0.05] text-white/55 hover:border-white/25 hover:text-white"
                        } ${isDisabled ? "cursor-not-allowed opacity-35" : ""}`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onDiscard}
                  disabled={isRegenerating}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/50 transition hover:border-white/30 hover:text-white disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isRegenerating ||
                    !details.courseCode ||
                    !details.university ||
                    !areaOfStudyValue ||
                    details.interests.length === 0
                  }
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRegenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Apply Changes
                </button>
              </div>
            </form>
          )}
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
            <div
              className={`flex items-center justify-between px-5 py-4 ${mockPass ? "bg-emerald-600" : "bg-red-500"}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                    Plan Validation
                  </p>
                  <p className="text-[12px] text-white/70">
                    {mockPass
                      ? "All requirements satisfied"
                      : "Some requirements not met"}
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
                { label: "Minimum credit points met", Icon: Award },
                { label: "Core units all scheduled", Icon: BookOpen },
                { label: "Specialisation requirements covered", Icon: Target },
                {
                  label: "No prerequisite conflicts detected",
                  Icon: GitBranch,
                },
                { label: "Elective slots filled", Icon: LayoutGrid },
              ].map(({ label, Icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${mockPass ? "text-emerald-500" : "text-red-400"}`}
                    />
                    <span className="text-[13px] text-black/60">{label}</span>
                  </div>
                  {mockPass ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-600">
                      Pass
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-red-500">
                      Fail
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-black/[0.06] px-5 py-4">
              <div className="flex items-center justify-between">
                <p
                  className={`text-[13px] font-medium ${mockPass ? "text-emerald-600" : "text-red-500"}`}
                >
                  {mockPass
                    ? "✓ On track to graduate"
                    : "✗ Requirements not met"}
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
