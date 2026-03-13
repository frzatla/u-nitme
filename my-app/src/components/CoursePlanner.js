"use client";

const foundationUnits = [
  "FIT1045 Introduction to Programming",
  "FIT1047 Computer Systems",
  "MAT1830 Discrete Mathematics",
  "FIT1051 Database Concepts",
  "FIT2004 Algorithms and Data Structures",
  "FIT2099 Object-Oriented Design",
  "FIT2102 Programming Paradigms",
  "FIT3171 Databases",
  "FIT3143 Parallel Computing",
  "FIT3161 Computer Science Project",
  "FIT3077 Software Engineering",
  "FIT4001 Industry Experience Studio",
];

function buildSemesterPlan(studentDetails) {
  const start = Number(studentDetails?.yearStart);
  const end = Number(studentDetails?.yearEnd);
  const majorLabel =
    studentDetails?.major || studentDetails?.specialisation || "Core";

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }

  const semesters = [];
  let unitIndex = 0;

  for (let year = start; year <= end; year += 1) {
    for (let semester = 1; semester <= 2; semester += 1) {
      const coreUnit =
        foundationUnits[unitIndex] ||
        `${majorLabel} Elective ${String(unitIndex - foundationUnits.length + 1).padStart(2, "0")}`;
      const companionUnit =
        foundationUnits[unitIndex + 1] ||
        `${studentDetails?.faculty || "Faculty"} Elective ${String(unitIndex - foundationUnits.length + 2).padStart(2, "0")}`;

      semesters.push({
        id: `${year}-s${semester}`,
        title: `Semester ${semester}`,
        year,
        units: [
          coreUnit,
          companionUnit,
          `${majorLabel} Studio ${semester}`,
          `${studentDetails?.university || "University"} Breadth`,
        ],
      });

      unitIndex += 2;
    }
  }

  return semesters;
}

export default function CoursePlanner({ studentDetails }) {
  const semesters = buildSemesterPlan(studentDetails);

  if (semesters.length === 0) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-black">
          No semester plan available yet
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-black/45">
          Update the academic timeline in your details form to generate a
          semester-by-semester course map.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {semesters.map((semester) => (
        <section
          key={semester.id}
          className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-black/30">
                {semester.year}
              </p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-black">
                {semester.title}
              </h2>
            </div>
            <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-[12px] font-medium text-black/50">
              24 credit points
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {semester.units.map((unit) => (
              <div
                key={unit}
                className="rounded-2xl border border-black/[0.08] bg-[#f7f7f5] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium leading-6 text-black">
                      {unit}
                    </p>
                    <p className="mt-1 text-[13px] text-black/40">
                      Scheduled to balance core progression and electives.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-black/35">
                    Planned
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
