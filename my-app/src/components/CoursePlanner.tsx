"use client";

import { useState } from "react";
import {
  Sparkles,
  RotateCcw,
  Download,
  BookOpen,
  TrendingUp,
  Plus,
  ChevronRight,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { Schedule, UnitCategory } from "@/lib/types";
import UnitReviewModal from "./UnitReviewModal";

type Unit = {
  code: string;
  name: string;
  category: UnitCategory;
  level: string;
  cp: number;
};

type Semester = {
  id: string;
  title: string;
  year: number;
  units: Unit[];
};

type YearGroup = {
  year: number;
  yearLabel: string;
  semesters: Semester[];
};

type Summary = {
  totalPlannedUnits: number;
  totalCredits: number;
  progress: number;
  completedTarget: number;
  breakdown: Record<UnitCategory, number>;
};

const categoryPillStyles: Record<UnitCategory, string> = {
  Core: "border-[#719DEE] bg-[#719DEE] text-white",
  Major: "border-[#79B98B] bg-[#79B98B] text-white",
  Minor: "border-[#F5DF8E] bg-[#F5DF8E] text-black/80",
  Elective: "border-[#DD8255] bg-[#DD8255] text-white",
  Specialisation: "border-[#A07ED1] bg-[#A07ED1] text-white",
};

const categoryDotStyles: Record<UnitCategory, string> = {
  Core: "bg-[#719DEE]",
  Major: "bg-[#79B98B]",
  Minor: "bg-[#F5DF8E]",
  Elective: "bg-[#DD8255]",
  Specialisation: "bg-[#A07ED1]",
};

type StudentDetails = {
  planName?: string;
  university?: string;
  yearStart?: number | string;
  yearEnd?: number | string;
};

type CoursePlannerProps = {
  schedule: Schedule;
  studentDetails: StudentDetails;
  showHeader?: boolean;
};

// Convert algo1.py "Year 1, Semester 1" label into a relative year number (1-based)
function parseYearFromLabel(label: string): number {
  const match = label.match(/Year\s+(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

function parseSemNumFromLabel(label: string): number {
  const match = label.match(/Semester\s+(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

function buildFromSchedule(schedule: Schedule, yearStart: number): Semester[] {
  return schedule.schedule
    .filter((s) => s.period !== null)
    .map((s) => {
      const relativeYear = parseYearFromLabel(s.semester);
      const semNum = parseSemNumFromLabel(s.semester);
      const calendarYear = yearStart + (relativeYear - 1);

      return {
        id: s.semester,
        title: `Semester ${semNum}`,
        year: calendarYear,
        units: s.units.map((u) => ({
          code: u.code,
          name: u.title,
          category: u.category,
          level: u.level !== null ? `L${u.level}` : "—",
          cp: u.credit_points,
        })),
      };
    });
}

function groupSemestersByYear(semesters: Semester[]): YearGroup[] {
  const map = new Map<number, Semester[]>();
  semesters.forEach((sem) => {
    if (!map.has(sem.year)) map.set(sem.year, []);
    map.get(sem.year)!.push(sem);
  });

  return Array.from(map.entries()).map(([year, sems], index) => ({
    year,
    yearLabel: `Year ${index + 1}`,
    semesters: sems,
  }));
}

function getSummary(semesters: Semester[], schedule: Schedule): Summary {
  const totalPlannedUnits = schedule.summary.total_units;
  const totalCredits = schedule.summary.total_cp;
  // Total slots across all semesters (required + free elective placeholders) = full degree length
  const completedTarget = semesters.reduce((n, s) => n + s.units.length, 0);
  const progress = completedTarget > 0
    ? Math.min(100, Math.round((totalPlannedUnits / completedTarget) * 100))
    : 0;

  const breakdown: Record<UnitCategory, number> = {
    Core: 0, Major: 0, Minor: 0, Elective: 0, Specialisation: 0,
  };
  semesters.forEach((sem) =>
    sem.units.forEach((u) => { breakdown[u.category] = (breakdown[u.category] ?? 0) + 1; })
  );

  return { totalPlannedUnits, totalCredits, progress, completedTarget, breakdown };
}

function UnitCard({ unit, onClick }: { unit: Unit; onClick: () => void }) {
  const pillStyle = categoryPillStyles[unit.category];
  const isElective = unit.code === "ELECTIVE";

  return (
    <button
      onClick={onClick}
      disabled={isElective}
      className="w-full rounded-[18px] border border-black/10 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-left transition hover:border-black/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] disabled:cursor-default disabled:hover:border-black/10 disabled:hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${pillStyle}`}
        >
          {unit.category}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-black/18">
          {unit.level}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-[17px] font-medium tracking-[-0.03em] text-black">
          {unit.code}
        </p>
        <p className="mt-1 text-[14px] leading-6 text-black/45">{unit.name}</p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-black/[0.06] pt-3">
        <span className="text-[13px] font-medium text-black/25">
          {unit.cp} CP
        </span>
        {!isElective && (
          <MessageSquare className="h-4 w-4 text-black/18" />
        )}
      </div>
    </button>
  );
}

function EmptyUnitCard() {
  return (
    <div className="flex min-h-[188px] items-center justify-center rounded-[18px] border border-dashed border-black/10 bg-white/55">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-black/12">
          <Plus className="h-5 w-5 text-black/20" />
        </div>
        <p className="mt-4 text-[14px] text-black/18">Add unit</p>
      </div>
    </div>
  );
}

export default function CoursePlanner({
  schedule,
  studentDetails,
  showHeader = true,
}: CoursePlannerProps) {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const yearStart = Number(studentDetails?.yearStart) || new Date().getFullYear();
  const semesters = buildFromSchedule(schedule, yearStart);

  if (semesters.length === 0) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-black">
          No course plan available yet
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-black/45">
          Update the academic timeline in your details form to generate a
          semester-by-semester course map.
        </p>
      </div>
    );
  }

  const years = groupSemestersByYear(semesters);
  const summary = getSummary(semesters, schedule);

  return (
    <div className="overflow-hidden rounded-[30px] border border-black/10 bg-[#f5f5f4]">
      {showHeader && (
        <section className="bg-black px-8 py-8 text-white md:px-10 md:py-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium text-white/70">
                <Sparkles className="h-3.5 w-3.5" />
                AI Generated
              </div>

              <h1 className="mt-5 text-[36px] font-semibold tracking-[-0.05em] text-white md:text-[52px]">
                Your Course Plan
              </h1>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {[schedule.course_title, schedule.specialisation, schedule.major, schedule.minor, schedule.campus]
                  .filter(Boolean)
                  .map((tag, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[14px] text-white/65"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:pt-14">
              <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-transparent px-5 py-3 text-[14px] font-medium text-white/72 transition hover:bg-white/[0.05]">
                <RotateCcw className="h-4 w-4" />
                Regenerate
              </button>

              <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-[14px] font-medium text-black transition hover:bg-white/90">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="px-8 py-8 md:px-10 md:py-10">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          <div className="rounded-[24px] bg-black p-6 text-white">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-white/50">
              <GraduationCap className="h-4 w-4" />
              Progress
            </div>

            <div className="mt-6 text-[48px] font-semibold tracking-[-0.05em]">
              {summary.progress}%
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${summary.progress}%` }}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-6">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-black/25">
              <BookOpen className="h-4 w-4" />
              Units
            </div>

            <div className="mt-6 text-[46px] font-semibold tracking-[-0.05em] text-black">
              {summary.totalPlannedUnits}
              <span className="ml-1 text-black/20">
                /{summary.completedTarget}
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-6">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-black/25">
              <TrendingUp className="h-4 w-4" />
              Credits
            </div>

            <div className="mt-6 text-[46px] font-semibold tracking-[-0.05em] text-black">
              {summary.totalCredits}
              <span className="ml-1 text-[28px] text-black/20">CP</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-6">
            <div className="text-[12px] uppercase tracking-[0.14em] text-black/25">
              Breakdown
            </div>

            <div className="mt-6 space-y-3">
              {(Object.entries(summary.breakdown) as [UnitCategory, number][])
                .filter(([, count]) => count > 0)
                .map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[14px] text-black/55">
                      <span className={`h-2.5 w-2.5 rounded-full ${categoryDotStyles[key]}`} />
                      {key}
                    </div>
                    <span className="text-[14px] font-medium text-black/55">
                      {value}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          {years.map((yearGroup) => (
            <div key={yearGroup.year}>
              <div className="mb-5 flex items-center gap-4">
                <span className="rounded-2xl bg-black px-4 py-2 text-[16px] font-semibold text-white">
                  {yearGroup.year}
                </span>
                <div className="h-px flex-1 bg-black/10" />
                <span className="text-[14px] text-black/25">
                  {yearGroup.yearLabel}
                </span>
              </div>

              <div className="space-y-5">
                {yearGroup.semesters.map((semester) => {
                  const semesterCredits = semester.units.reduce((sum, u) => sum + u.cp, 0);

                  return (
                    <section
                      key={semester.id}
                      className="overflow-hidden rounded-[24px] border border-black/10 bg-[#fafaf9]"
                    >
                      <div className="flex flex-col gap-3 border-b border-black/[0.06] px-6 py-5 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <h2 className="text-[18px] font-medium tracking-[-0.03em] text-black">
                            {semester.title}
                          </h2>
                          <ChevronRight className="h-4 w-4 text-black/15" />
                          <span className="text-[15px] text-black/28">
                            {semester.year}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-[15px] text-black/32">
                            {semester.units.length} units
                          </span>
                          <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[13px] font-medium text-black/30">
                            {semesterCredits} CP
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-0 border-black/[0.05] md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, slotIndex) => {
                          const unit = semester.units[slotIndex];
                          return (
                            <div
                              key={`${semester.id}-${slotIndex}`}
                              className="border-r-0 border-b border-black/[0.05] p-4 last:border-b-0 md:border-r xl:border-b-0 xl:last:border-r-0"
                            >
                              {unit ? <UnitCard unit={unit} onClick={() => setSelectedUnit(unit)} /> : <EmptyUnitCard />}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <UnitReviewModal
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
      />
    </div>
  );
}
