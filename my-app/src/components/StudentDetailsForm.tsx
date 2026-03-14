import { HTMLProps } from "react";
import { readFileSync } from "fs";
import path from "path";
import StudentDetailsFormContent from "./StudentDetailsFormContent";

type CourseOption = { code: string; title: string };
type AosOption = { code: string; title: string };

function loadData(): {
  courses: CourseOption[];
  aosList: AosOption[];
  courseToAos: Record<string, string[]>;
} {
  const dataDir = path.join(process.cwd(), "public/data");
  const coursesRaw = JSON.parse(readFileSync(path.join(dataDir, "final_courses.json"), "utf-8"));
  const aosRaw = JSON.parse(readFileSync(path.join(dataDir, "final_aos.json"), "utf-8"));

  // Only AOS that exist in final_aos.json AND have credit points
  const validAosCodes = new Set(
    Object.values(aosRaw)
      .filter((a: any) => a.total_credit_points > 0)
      .map((a: any) => a.course_code)
  );

  const aosList: AosOption[] = Object.values(aosRaw)
    .filter((a: any) => a.course_title && a.total_credit_points > 0)
    .map((a: any) => ({ code: a.course_code, title: a.course_title }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const courses: CourseOption[] = Object.values(coursesRaw)
    .filter((c: any) => c.course_title)
    .map((c: any) => ({ code: c.course_code, title: c.course_title }))
    .sort((a, b) => a.title.localeCompare(b.title));

  // For each course, collect AOS codes only from groups where:
  // - credit_points > 0 (substantive requirement, not optional electives)
  // - every unit in the group is a valid AOS code (no mixed FIT/MAT units)
  const courseToAos: Record<string, string[]> = {};
  for (const course of Object.values(coursesRaw) as any[]) {
    const found: string[] = [];
    for (const group of course.requirement_groups ?? []) {
      const units: string[] = group.units ?? [];
      if (units.length === 0) continue;
      if (group.credit_points <= 0) continue;
      const allAos = units.every((u: string) => validAosCodes.has(u));
      if (!allAos) continue;
      for (const unit of units) {
        if (!found.includes(unit)) found.push(unit);
      }
    }
    if (found.length > 0) {
      courseToAos[course.course_code] = found;
    }
  }

  return { courses, aosList, courseToAos };
}

export default async function StudentDetailsForm({
  action,
}: HTMLProps<"form">) {
  const { courses, aosList, courseToAos } = loadData();

  return (
    <div className="rounded-3xl border border-black/10 bg-white px-7 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] md:px-8 md:py-9">
      <form action={action} className="space-y-7">
        <StudentDetailsFormContent
          courses={courses}
          aosList={aosList}
          courseToAos={courseToAos}
        />
      </form>
    </div>
  );
}
