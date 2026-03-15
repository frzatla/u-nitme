"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Sparkles,
  RotateCcw,
  Download,
  BookOpen,
  TrendingUp,
  Plus,
  Ellipsis,
  ChevronRight,
  GraduationCap,
  GripVertical,
  Search,
} from "lucide-react";
import { Schedule, UnitCategory } from "@/lib/types";
import UnitDetailPanel from "./UnitDetailPanel";
import ElectiveSearch from "./ElectiveSearch";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Unit = {
  code: string;
  name: string;
  category: UnitCategory;
  level: string;
  cp: number;
};

export type Slot = Unit | null;

export type Semester = {
  id: string;
  title: string;
  year: number;
  units: Slot[]; // always exactly 4 slots
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
  onSemestersChange?: (semesters: Semester[]) => void;
};

// ── Styles ────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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
      return {
        id: s.semester,
        title: `Semester ${semNum}`,
        year: yearStart + (relativeYear - 1),
        units: Array.from({ length: 4 }, (_, i) => {
          const u = s.units[i];
          return u
            ? {
                code: u.code,
                name: u.title,
                category: u.category,
                level: u.level !== null ? `L${u.level}` : "—",
                cp: u.credit_points,
              }
            : null;
        }),
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
  const completedTarget = semesters.length * 4;
  const progress = completedTarget > 0
    ? Math.min(100, Math.round((totalPlannedUnits / completedTarget) * 100))
    : 0;

  const breakdown: Record<UnitCategory, number> = {
    Core: 0, Major: 0, Minor: 0, Elective: 0, Specialisation: 0,
  };
  semesters.forEach((sem) =>
    sem.units.forEach((u) => {
      if (u) breakdown[u.category] = (breakdown[u.category] ?? 0) + 1;
    })
  );

  return { totalPlannedUnits, totalCredits, progress, completedTarget, breakdown };
}

// ── Requisite types (matches handbook API response) ──────────────────────────

type RequisiteGroup = { connector: string; codes: string[] };
type Requisite = { type: string; groups: RequisiteGroup[] };

function computeValidSemesters(
  semesters: Semester[],
  draggedCode: string,
  draggedRequisites: Requisite[],
  allRequisites: Map<string, Requisite[]>
): Set<string> {
  // Map: code → current semester index, excluding the dragged unit
  const unitSemIdx = new Map<string, number>();
  semesters.forEach((sem, idx) => {
    sem.units.forEach((unit) => {
      if (unit && unit.code !== "ELECTIVE" && unit.code !== draggedCode)
        unitSemIdx.set(unit.code, idx);
    });
  });

  const validIds = new Set<string>();

  for (let targetIdx = 0; targetIdx < semesters.length; targetIdx++) {
    const sem = semesters[targetIdx];
    let valid = true;

    // ── Step 1: dragged unit's own requisites ────────────────────────────────
    for (const req of draggedRequisites) {
      const type = req.type.toLowerCase();

      if (type.includes("prerequisite")) {
        for (const group of req.groups) {
          const inSchedule = group.codes.filter((c) => unitSemIdx.has(c));
          if (inSchedule.length === 0) continue;
          const satisfied = inSchedule.some((c) => unitSemIdx.get(c)! < targetIdx);
          if (!satisfied) { valid = false; break; }
        }
      } else if (type.includes("corequisite")) {
        for (const group of req.groups) {
          const inSchedule = group.codes.filter((c) => unitSemIdx.has(c));
          if (inSchedule.length === 0) continue;
          const satisfied = inSchedule.some((c) => unitSemIdx.get(c)! <= targetIdx);
          if (!satisfied) { valid = false; break; }
        }
      } else if (type.includes("prohibit") || type.includes("incompatible")) {
        for (const group of req.groups) {
          for (const code of group.codes) {
            const codeIdx = unitSemIdx.get(code);
            if (codeIdx !== undefined && codeIdx < targetIdx) {
              valid = false; break;
            }
          }
          if (!valid) break;
        }
      }

      if (!valid) break;
    }

    // ── Step 2: units at or before targetIdx that depend on draggedCode ───────
    // If unit Y (at semester si ≤ targetIdx) lists draggedCode as a prereq or
    // coreq, placing dragged unit at targetIdx may violate Y's constraint.
    if (valid) {
      outer: for (let si = 0; si <= targetIdx; si++) {
        for (const unit of semesters[si].units) {
          if (!unit || unit.code === "ELECTIVE" || unit.code === draggedCode) continue;
          for (const req of allRequisites.get(unit.code) ?? []) {
            const type = req.type.toLowerCase();
            for (const group of req.groups) {
              if (!group.codes.includes(draggedCode)) continue;
              if (type.includes("prerequisite")) {
                // draggedCode is a prereq of unit at si → must be strictly before si
                if (targetIdx >= si) { valid = false; break outer; }
              } else if (type.includes("corequisite")) {
                // draggedCode is a coreq of unit at si → must be at ≤ si
                if (targetIdx > si) { valid = false; break outer; }
              }
            }
          }
        }
      }
    }

    if (valid) validIds.add(sem.id);
  }

  return validIds;
}

// Slot ID format: "semId||slotIdx" — double pipe avoids conflicts with semId content
function makeSlotId(semId: string, idx: number) {
  return `${semId}||${idx}`;
}

function parseSlotId(id: string): { semId: string; idx: number } {
  const sep = id.lastIndexOf("||");
  return { semId: id.slice(0, sep), idx: parseInt(id.slice(sep + 2)) };
}

function swapSlots(
  semesters: Semester[],
  srcId: string,
  tgtId: string
): Semester[] {
  if (srcId === tgtId) return semesters;
  const src = parseSlotId(srcId);
  const tgt = parseSlotId(tgtId);
  const next = semesters.map((s) => ({ ...s, units: [...s.units] as Slot[] }));
  const srcSem = next.find((s) => s.id === src.semId)!;
  const tgtSem = next.find((s) => s.id === tgt.semId)!;
  const tmp = srcSem.units[src.idx];
  srcSem.units[src.idx] = tgtSem.units[tgt.idx];
  tgtSem.units[tgt.idx] = tmp;
  return next;
}

// ── DnD sub-components ────────────────────────────────────────────────────────

function UnitCardContent({ unit, isDragging = false }: { unit: Unit; isDragging?: boolean }) {
  const pillStyle = categoryPillStyles[unit.category];
  const isElective = unit.code === "ELECTIVE";

  if (isElective) {
    return (
      <div
        className={`w-full rounded-[18px] border border-dashed border-[#DD8255]/40 bg-[#DD8255]/[0.04] p-4 transition-all hover:border-[#DD8255]/70 hover:bg-[#DD8255]/[0.07] ${
          isDragging ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${pillStyle}`}
          >
            {unit.category}
          </span>
          <GripVertical className="h-4 w-4 text-black/20" />
        </div>
        <div className="mt-5 flex flex-col items-start gap-1">
          <Search className="h-5 w-5 text-[#DD8255]/60" />
          <p className="text-[15px] font-medium tracking-[-0.03em] text-black/60">
            Free Elective
          </p>
          <p className="text-[12px] text-black/35">Click to search for a unit</p>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-black/[0.06] pt-3">
          <span className="text-[13px] font-medium text-black/25">{unit.cp} CP</span>
          <Search className="h-4 w-4 text-[#DD8255]/40" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-[18px] border border-black/10 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-opacity ${
        isDragging ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${pillStyle}`}
        >
          {unit.category}
        </span>
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-4 w-4 text-black/20" />
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-black/18">
            {unit.level}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[17px] font-medium tracking-[-0.03em] text-black">
          {unit.code}
        </p>
        <p className="mt-1 text-[14px] leading-6 text-black/45">{unit.name}</p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-black/[0.06] pt-3">
        <span className="text-[13px] font-medium text-black/25">{unit.cp} CP</span>
        <Ellipsis className="h-4 w-4 text-black/18" />
      </div>
    </div>
  );
}

function DraggableUnitCard({
  unit,
  slotId,
  onCardClick,
  onElectiveClick,
}: {
  unit: Unit;
  slotId: string;
  onCardClick: (unit: Unit) => void;
  onElectiveClick?: (slotId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: slotId });

  const style = {
    transform: CSS.Translate.toString(transform),
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (unit.code === "ELECTIVE") {
          onElectiveClick?.(slotId);
        } else {
          onCardClick(unit);
        }
      }}
    >
      <UnitCardContent unit={unit} isDragging={isDragging} />
    </div>
  );
}

function DroppableSlot({
  slotId,
  children,
}: {
  slotId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });

  return (
    <div
      ref={setNodeRef}
      className={`border-r-0 border-b border-black/[0.05] p-4 last:border-b-0 md:border-r xl:border-b-0 xl:last:border-r-0 rounded-[4px] transition-colors ${
        isOver ? "bg-black/[0.03]" : ""
      }`}
    >
      {children}
    </div>
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

// ── Main component ────────────────────────────────────────────────────────────

export default function CoursePlanner({
  schedule,
  studentDetails,
  showHeader = true,
  onSemestersChange,
}: CoursePlannerProps) {
  const yearStart = Number(studentDetails?.yearStart) || new Date().getFullYear();
  const [semesters, setSemesters] = useState(() =>
    buildFromSchedule(schedule, yearStart)
  );
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [overSemId, setOverSemId] = useState<string | null>(null);
  const [validSemIds, setValidSemIds] = useState<Set<string> | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [electiveSlotId, setElectiveSlotId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const slotId = String(event.active.id);
    setActiveSlotId(slotId);
    setValidSemIds(null); // null = loading, all semesters neutral

    const { semId, idx } = parseSlotId(slotId);
    const unit = semesters.find((s) => s.id === semId)?.units[idx];
    if (!unit || unit.code === "ELECTIVE") {
      // ELECTIVEs can go anywhere
      setValidSemIds(new Set(semesters.map((s) => s.id)));
      return;
    }

    // Fetch handbook data for ALL non-ELECTIVE units in parallel
    const allCodes = [
      ...new Set(
        semesters
          .flatMap((s) => s.units)
          .filter((u): u is Unit => u !== null && u.code !== "ELECTIVE")
          .map((u) => u.code)
      ),
    ];

    Promise.all(
      allCodes.map((code) =>
        fetch(`/api/units/${code}/handbook`)
          .then((r) => r.json())
          .then((data) => ({ code, requisites: (data.requisites ?? []) as Requisite[] }))
          .catch(() => ({ code, requisites: [] as Requisite[] }))
      )
    ).then((results) => {
      const allReqs = new Map(results.map((r) => [r.code, r.requisites]));
      const draggedReqs = allReqs.get(unit.code) ?? [];
      setValidSemIds(computeValidSemesters(semesters, unit.code, draggedReqs, allReqs));
    });
  }

  function handleDragOver(event: DragOverEvent) {
    setOverSemId(event.over ? parseSlotId(String(event.over.id)).semId : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const { semId: targetSemId } = parseSlotId(String(over.id));
      // Block drop on invalid semesters
      if (validSemIds !== null && !validSemIds.has(targetSemId)) {
        setActiveSlotId(null);
        setOverSemId(null);
        setValidSemIds(null);
        return;
      }
      const next = swapSlots(semesters, String(active.id), String(over.id));
      setSemesters(next);
      onSemestersChange?.(next);
    }

    setActiveSlotId(null);
    setOverSemId(null);
    setValidSemIds(null);
  }

  function handleDragCancel() {
    setActiveSlotId(null);
    setOverSemId(null);
    setValidSemIds(null);
  }

  function handleElectiveSelected(unit: Unit) {
    if (!electiveSlotId) return;
    const { semId, idx } = parseSlotId(electiveSlotId);
    const next = semesters.map((s) => {
      if (s.id !== semId) return s;
      const units = [...s.units] as Slot[];
      units[idx] = unit;
      return { ...s, units };
    });
    setSemesters(next);
    onSemestersChange?.(next);
    setElectiveSlotId(null);
  }

  // Find the unit being dragged (for DragOverlay)
  const activeUnit = (() => {
    if (!activeSlotId) return null;
    const { semId, idx } = parseSlotId(activeSlotId);
    return semesters.find((s) => s.id === semId)?.units[idx] ?? null;
  })();

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
                <span className="ml-1 text-black/20">/{summary.completedTarget}</span>
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
                      <span className="text-[14px] font-medium text-black/55">{value}</span>
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
                  <span className="text-[14px] text-black/25">{yearGroup.yearLabel}</span>
                </div>

                <div className="space-y-5">
                  {yearGroup.semesters.map((semester) => {
                    const semesterCredits = semester.units.reduce((sum, u) => sum + (u?.cp ?? 0), 0);
                    const semUnitCount = semester.units.filter(Boolean).length;

                    const isDragging = activeSlotId !== null;
                    const draggedSemId = activeSlotId ? parseSlotId(activeSlotId).semId : null;
                    const isSource = draggedSemId === semester.id;
                    const isHovered = overSemId === semester.id;
                    const isValid = !isDragging || validSemIds === null || validSemIds.has(semester.id);

                    let semCardClass = "overflow-hidden rounded-[24px] border transition-all duration-150 ";
                    if (!isDragging || validSemIds === null) {
                      semCardClass += "border-black/10 bg-[#fafaf9]";
                    } else if (isSource) {
                      semCardClass += "border-black/10 bg-[#fafaf9] opacity-60";
                    } else if (isHovered && isValid) {
                      semCardClass += "border-emerald-400/80 bg-emerald-50/40 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]";
                    } else if (isHovered && !isValid) {
                      semCardClass += "border-red-400/80 bg-red-50/40 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]";
                    } else if (isValid) {
                      semCardClass += "border-emerald-300/50 bg-[#fafaf9]";
                    } else {
                      semCardClass += "border-black/5 bg-[#fafaf9] opacity-40";
                    }

                    return (
                      <section
                        key={semester.id}
                        className={semCardClass}
                      >
                        <div className="flex flex-col gap-3 border-b border-black/[0.06] px-6 py-5 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4">
                            <h2 className="text-[18px] font-medium tracking-[-0.03em] text-black">
                              {semester.title}
                            </h2>
                            <ChevronRight className="h-4 w-4 text-black/15" />
                            <span className="text-[15px] text-black/28">{semester.year}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[15px] text-black/32">{semUnitCount} units</span>
                            <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[13px] font-medium text-black/30">
                              {semesterCredits} CP
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-0 border-black/[0.05] md:grid-cols-2 xl:grid-cols-4">
                          {semester.units.map((unit, slotIdx) => {
                            const slotId = makeSlotId(semester.id, slotIdx);
                            const isBeingDragged = activeSlotId === slotId;

                            return (
                              <DroppableSlot
                                key={slotId}
                                slotId={slotId}
                              >
                                {unit ? (
                                  <DraggableUnitCard
                                    unit={unit}
                                    slotId={slotId}
                                    onCardClick={setSelectedUnit}
                                    onElectiveClick={setElectiveSlotId}
                                  />
                                ) : (
                                  <EmptyUnitCard />
                                )}
                              </DroppableSlot>
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
      </div>

      {/* Floating card that follows the cursor while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeUnit ? (
          <div className="rotate-1 scale-[1.03] shadow-2xl">
            <UnitCardContent unit={activeUnit} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Unit detail side panel */}
      <UnitDetailPanel
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
      />

      {/* Elective search modal */}
      <ElectiveSearch
        isOpen={electiveSlotId !== null}
        onClose={() => setElectiveSlotId(null)}
        onSelectUnit={handleElectiveSelected}
      />
    </DndContext>
  );
}
