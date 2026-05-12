import { readFileSync } from "fs";
import path from "path";

export type CourseOption = { code: string; title: string };
export type AosOption = { code: string; title: string };

export type CoursePlanOptions = {
  courses: CourseOption[];
  aosList: AosOption[];
  minorAosList: AosOption[];
  majorAosList: AosOption[];
  courseToAos: Record<string, string[]>;
};

const MOCK_DATA_DIR = path.join(process.cwd(), "..", "algo", "src", "data");

function readJson(filename: string) {
  return JSON.parse(readFileSync(path.join(MOCK_DATA_DIR, filename), "utf-8"));
}

export function loadCoursePlanOptions(): CoursePlanOptions {
  const coursesRaw = readJson("mock_courses.json");
  const aosRaw = readJson("mock_aos.json");

  const validAosCodes = new Set<string>(
    Object.values(aosRaw)
      .filter((a: any) => a.total_credit_points > 0)
      .map((a: any) => a.course_code),
  );

  const aosList: AosOption[] = Object.values(aosRaw)
    .filter((a: any) => a.course_title && a.total_credit_points > 0)
    .map((a: any) => ({ code: a.course_code, title: a.course_title }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const minorAosList: AosOption[] = Object.values(aosRaw)
    .filter((a: any) => a.course_title && a.total_credit_points === 24)
    .map((a: any) => ({ code: a.course_code, title: a.course_title }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const majorAosList: AosOption[] = Object.values(aosRaw)
    .filter((a: any) => a.course_title && a.total_credit_points === 48)
    .map((a: any) => ({ code: a.course_code, title: a.course_title }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const courses: CourseOption[] = Object.values(coursesRaw)
    .filter((c: any) => c.course_title)
    .map((c: any) => ({ code: c.course_code, title: c.course_title }))
    .sort((a, b) => a.code.localeCompare(b.code));

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
