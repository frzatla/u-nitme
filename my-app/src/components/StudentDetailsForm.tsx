import { HTMLProps } from "react";
import { readFileSync } from "fs";
import path from "path";
import StudentDetailsFormContent from "./StudentDetailsFormContent";

type CourseOption = { code: string; title: string };
type AosOption = { code: string; title: string };

// ── data loading ──────────────────────────────────────────────────────────────

function readJson(filename: string) {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "public/data", filename), "utf-8"),
  );
}

function loadData(): {
  courses: CourseOption[];
  aosList: AosOption[];
  minorAosList: AosOption[];
  majorAosList: AosOption[];
  courseToAos: Record<string, string[]>;
} {
  const coursesRaw = readJson("final_courses.json");
  const aosRaw = readJson("final_aos.json");

  // Valid AOS = present in final_aos.json with non-zero credit points
  const validAosCodes = new Set<string>(
    Object.values(aosRaw)
      .filter((a: any) => a.total_credit_points > 0)
      .map((a: any) => a.course_code),
  );

  const aosList: AosOption[] = Object.values(aosRaw)
    .filter((a: any) => a.course_title && a.total_credit_points > 0)
    .map((a: any) => ({ code: a.course_code, title: a.course_title }))
    .sort((a, b) => a.code.localeCompare(b.code));

  // Monash convention: minors = 24 CP, majors = 48 CP
  const minorAosList: AosOption[] = Object.values(aosRaw)
    .filter((a: any) => a.course_title && a.total_credit_points === 24)
    .map((a: any) => ({ code: a.course_code, title: a.course_title }))
    .sort((a: AosOption, b: AosOption) => a.code.localeCompare(b.code));

  const majorAosList: AosOption[] = Object.values(aosRaw)
    .filter((a: any) => a.course_title && a.total_credit_points === 48)
    .map((a: any) => ({ code: a.course_code, title: a.course_title }))
    .sort((a: AosOption, b: AosOption) => a.code.localeCompare(b.code));

  const courses: CourseOption[] = Object.values(coursesRaw)
    .filter((c: any) => c.course_title)
    .map((c: any) => ({ code: c.course_code, title: c.course_title }))
    .sort((a, b) => a.code.localeCompare(b.code));

  // Map each course to its valid AOS codes.
  // A requirement group contributes AOS codes only when:
  //   1. credit_points > 0  (excludes optional discipline-elective groups)
  //   2. every unit in the group is a valid AOS code  (excludes mixed FIT/MAT groups)
  const courseToAos: Record<string, string[]> = {};
  for (const course of Object.values(coursesRaw) as any[]) {
    const found: string[] = [];
    for (const group of course.requirement_groups ?? []) {
      const units: string[] = group.units ?? [];
      if (!units.length || group.credit_points <= 0) continue;
      if (!units.every((u) => validAosCodes.has(u))) continue;
      for (const u of units) {
        if (!found.includes(u)) found.push(u);
      }
    }
    if (found.length) courseToAos[course.course_code] = found;
  }
  return { courses, aosList, minorAosList, majorAosList, courseToAos };
}

// ── component ─────────────────────────────────────────────────────────────────

export default async function StudentDetailsForm({
  action,
}: HTMLProps<"form">) {
  const { courses, aosList, minorAosList, majorAosList, courseToAos } =
    loadData();

  return (
    <div className="rounded-3xl border border-black/10 bg-white px-7 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] md:px-8 md:py-9">
      <form action={action} className="space-y-7">
        <StudentDetailsFormContent
          courseCode={courses}
          aosList={aosList}
          minorAosList={minorAosList}
          majorAosList={majorAosList}
          courseToAos={courseToAos}
        />
      </form>
    </div>
  );
}
