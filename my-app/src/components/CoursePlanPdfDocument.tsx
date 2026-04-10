import { Plan } from "@/lib/types";

type Props = {
  plan: Plan;
  infoPills: string[];
};

function categoryTone(category: string): string {
  switch (category) {
    case "Core":
      return "bg-[#719DEE]/15 text-[#355ea9]";
    case "Major":
      return "bg-[#79B98B]/16 text-[#2d7040]";
    case "Minor":
      return "bg-[#F5DF8E]/40 text-[#775f00]";
    case "Elective":
      return "bg-[#DD8255]/15 text-[#9c4e27]";
    case "Specialisation":
      return "bg-[#A07ED1]/15 text-[#65449a]";
    default:
      return "bg-black/[0.05] text-black/60";
  }
}

export default function CoursePlanPdfDocument({ plan, infoPills }: Props) {
  const semesters = plan.schedule?.schedule.filter((semester) => semester.period);

  return (
    <main className="min-h-screen bg-[#f3f0e8] px-6 py-8 text-black md:px-10">
      <div className="mx-auto max-w-5xl rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)] print:rounded-none print:shadow-none">
        <header className="border-b border-black/10 px-8 py-8 md:px-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-black/35">
                U-NIT ME Course Plan
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-black">
                {plan.planName}
              </h1>
            </div>

            <div className="rounded-2xl bg-black px-5 py-4 text-right text-white">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                Total
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                {plan.schedule?.summary.total_cp ?? 0}
              </div>
              <div className="text-xs text-white/60">Credit points</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {infoPills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs text-black/60"
              >
                {pill}
              </span>
            ))}
          </div>
        </header>

        <section className="grid gap-4 border-b border-black/10 px-8 py-6 text-sm md:grid-cols-4 md:px-10">
          <div className="rounded-2xl bg-[#f5f4ef] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/35">
              University
            </p>
            <p className="mt-2 font-medium text-black">{plan.university}</p>
          </div>
          <div className="rounded-2xl bg-[#f5f4ef] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/35">
              Course Code
            </p>
            <p className="mt-2 font-medium text-black">{plan.courseCode}</p>
          </div>
          <div className="rounded-2xl bg-[#f5f4ef] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/35">
              Duration
            </p>
            <p className="mt-2 font-medium text-black">
              {plan.yearStart} - {plan.yearEnd}
            </p>
          </div>
          <div className="rounded-2xl bg-[#f5f4ef] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/35">
              Units
            </p>
            <p className="mt-2 font-medium text-black">
              {plan.schedule?.summary.total_units ?? 0}
            </p>
          </div>
        </section>

        <section className="space-y-8 px-8 py-8 md:px-10">
          {semesters?.map((semester) => (
            <section
              key={semester.semester}
              className="break-inside-avoid overflow-hidden rounded-[24px] border border-black/10"
            >
              <div className="flex items-center justify-between bg-[#f5f4ef] px-5 py-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.04em] text-black">
                    {semester.semester}
                  </h2>
                  <p className="mt-1 text-sm text-black/45">{semester.period}</p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-black/35">
                    Semester Load
                  </p>
                  <p className="mt-1 text-lg font-semibold text-black">
                    {semester.total_cp} CP
                  </p>
                </div>
              </div>

              <div className="grid gap-px bg-black/8 md:grid-cols-2">
                {semester.units.map((unit) => (
                  <article key={`${semester.semester}-${unit.code}`} className="bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold tracking-[-0.03em] text-black">
                          {unit.code}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-black/55">
                          {unit.title}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${categoryTone(unit.category)}`}
                      >
                        {unit.category}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs text-black/40">
                      <span>{unit.credit_points} CP</span>
                      <span>
                        {unit.level !== null ? `Level ${unit.level}` : "Level —"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>

        <footer className="border-t border-black/10 px-8 py-5 text-xs text-black/35 md:px-10">
          Generated by U-NIT ME. Always verify your enrolment and handbook rules with the official university source.
        </footer>
      </div>
    </main>
  );
}
