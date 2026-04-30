import { Plan, ScheduledUnit } from "@/lib/types";

type Props = {
  plan: Plan;
  infoPills: string[];
};

const semesterBlockStyle = {
  breakInside: "avoid",
  pageBreakInside: "avoid",
} as const;

function categoryTone(category: string): string {
  switch (category) {
    case "Core":
      return "border-[#719DEE]/20 bg-[#719DEE]/15 text-[#355ea9]";
    case "Major":
      return "border-[#79B98B]/20 bg-[#79B98B]/16 text-[#2d7040]";
    case "Minor":
      return "border-[#F5DF8E]/30 bg-[#F5DF8E]/40 text-[#775f00]";
    case "Elective":
      return "border-[#DD8255]/20 bg-[#DD8255]/15 text-[#9c4e27]";
    case "Specialisation":
      return "border-[#A07ED1]/20 bg-[#A07ED1]/15 text-[#65449a]";
    default:
      return "border-black/10 bg-black/[0.03] text-black/55";
  }
}

function formatTimestamp() {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function padUnits(units: ScheduledUnit[], count = 4): (ScheduledUnit | null)[] {
  return Array.from({ length: count }, (_, index) => units[index] ?? null);
}

function UnitCell({ unit }: { unit: ScheduledUnit | null }) {
  if (!unit) {
    return (
      <div className="min-h-[132px] border border-dashed border-black/12 bg-[linear-gradient(180deg,#fcfcfa_0%,#f8f7f3_100%)] p-4 text-[12px] italic text-black/22">
        <span className="text-black/18">Empty</span>
      </div>
    );
  }

  return (
    <div className="min-h-[132px] border border-black/12 bg-[linear-gradient(180deg,#ffffff_0%,#fdfdfc_100%)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <p className="text-[13px] font-semibold tracking-[-0.02em] text-black">
            {unit.code}
          </p>
          <span className="text-[10px] text-black/35">
            {unit.credit_points} CP
          </span>
        </div>

        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] ${categoryTone(unit.category)}`}
        >
          {unit.category}
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-5 text-black/78">{unit.title}</p>

      <div className="mt-3 flex items-center gap-3 text-[10px] text-black/42">
        <p>Level {unit.level !== null ? unit.level : "—"}</p>
        <p>{unit.category}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: string;
}) {
  return (
    <div className="rounded-[18px] border border-black/8 bg-[linear-gradient(180deg,#f8f6f0_0%,#f2efe7_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-black/35">
        {label}
      </p>
      <p className="mt-2 text-[22px] font-semibold tracking-[-0.05em] text-black">
        {value}
      </p>
      {muted ? <p className="mt-1 text-[11px] text-black/45">{muted}</p> : null}
    </div>
  );
}

function SemesterSection({
  semester,
}: {
  semester: NonNullable<Plan["schedule"]>["schedule"][number];
}) {
  const units = padUnits(semester.units);

  return (
    <section style={semesterBlockStyle} className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-black px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white">
              {semester.period}
            </span>
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-black">
              {semester.semester}
            </h2>
          </div>
          <p className="mt-1 text-[11px] text-black/45">
            Four-slot semester layout
          </p>
        </div>

        <div className="rounded-full border border-black/10 bg-[#f7f4ec] px-3 py-1.5 text-right">
          <p className="text-[9px] uppercase tracking-[0.16em] text-black/38">
            Semester Load
          </p>
          <p className="text-[12px] font-semibold text-black">{semester.total_cp} CP</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="grid grid-cols-4 gap-0 bg-black/[0.04]">
          {units.map((unit, index) => (
            <UnitCell
              key={`${semester.semester}-${unit?.code ?? "empty"}-${index}`}
              unit={unit}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/10 py-1.5 last:border-b-0">
      <span className="text-[10px] uppercase tracking-[0.14em] text-white/42">
        {label}
      </span>
      <span className="text-[12px] text-white/78">{value}</span>
    </div>
  );
}

export default function CoursePlanPdfDocument({ plan, infoPills }: Props) {
  const semesters =
    plan.schedule?.schedule.filter((semester) => semester.period) ?? [];
  const timestamp = formatTimestamp();

  return (
    <main className="bg-[#ede9df] px-6 py-6 text-black print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-[1080px] overflow-hidden rounded-[28px] border border-black/6 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="relative overflow-hidden border-b border-black/10 bg-[linear-gradient(180deg,#faf8f2_0%,#ffffff_70%)] px-8 py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#719DEE_0%,#79B98B_32%,#F5DF8E_64%,#DD8255_100%)]" />
          <div className="flex items-center justify-between gap-4 text-[11px] text-black/65">
            <p>U-NIT ME | Course Planner</p>
            <p>{timestamp}</p>
          </div>

          <div className="mt-8 grid grid-cols-[1.15fr_0.85fr] items-start gap-6">
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-black/35">
                Generated Course Plan
              </p>
              <h1 className="mt-2 text-[36px] font-semibold tracking-[-0.05em] text-black">
                {plan.schedule?.course_title || plan.planName}
              </h1>
              <p className="mt-3 max-w-xl text-[12px] leading-5 text-black/62">
                Generated by U-NIT ME. This document maps your study plan into a
                clearer semester-by-semester structure. Always verify enrolment
                requirements against your official university handbook.
              </p>
            </div>

            <div className="rounded-[22px] bg-[linear-gradient(180deg,#121212_0%,#050505_100%)] px-5 py-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                Plan Snapshot
              </p>
              <p className="mt-2 text-[24px] font-semibold tracking-[-0.05em]">
                {plan.planName}
              </p>
              <div className="mt-4">
                <DetailLine label="Course" value={plan.courseCode} />
                <DetailLine label="University" value={plan.university} />
                <DetailLine
                  label="Timeline"
                  value={`${plan.yearStart} - ${plan.yearEnd}`}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {infoPills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[10px] text-black/60"
              >
                {pill}
              </span>
            ))}
          </div>
        </header>

        <section className="grid grid-cols-4 gap-3 border-b border-black/10 px-8 py-5">
          <SummaryCard
            label="Total Credit"
            value={String(plan.schedule?.summary.total_cp ?? 0)}
            muted="credit points"
          />
          <SummaryCard
            label="Total Units"
            value={String(plan.schedule?.summary.total_units ?? 0)}
            muted="scheduled units"
          />
          <SummaryCard
            label="Timeline"
            value={`${plan.yearStart} - ${plan.yearEnd}`}
            muted={`${semesters.length} semesters`}
          />
          <SummaryCard
            label="Campus"
            value={plan.schedule?.campus ?? "—"}
            muted="delivery campus"
          />
        </section>

        <section className="px-8 py-4">
          {semesters.map((semester) => (
            <SemesterSection key={semester.semester} semester={semester} />
          ))}
        </section>

        <footer className="border-t border-black/10 bg-[linear-gradient(180deg,#fbfaf7_0%,#f7f4ec_100%)] px-8 py-4 text-[10px] text-black/35">
          <div className="flex items-center justify-between gap-4">
            <p>Generated by U-NIT ME</p>
            <p>Always verify with the official university source.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
