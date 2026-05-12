import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "algo", "src", "data");
const UNITS_PATH = path.join(DATA_DIR, "mock_units.json");
const STUDENT_DATA_DIR = path.join(DATA_DIR, "mock_students");

type UnitRecord = {
  academic_org?: string;
  assessments?: { name: string; type: string }[];
  code: string;
  credit_points: string;
  level: number;
  offerings?: { location: string; mode: string; name: string; period: string }[];
  requisites?: {
    permission: boolean;
    prerequisites: string[];
    corequisites: string[];
    prohibitions: string[];
    cp_required: number;
  };
  sca_band?: number;
  school?: string;
  title: string;
  overview?: string;
};

type EnrolmentRecord = {
  student_id?: string;
  unit_code?: string;
  period?: string;
};

export type NewUnitInput = {
  code: string;
  title: string;
  creditPoints: number;
  level: number;
  school: string;
  academicOrg: string;
  overview: string;
  period: string;
  location: string;
  mode: string;
  prerequisites: string;
};

export type UnitAnalytics = {
  code: string;
  title: string;
  school: string;
  currentStudents: number;
  previousStudents: number;
  totalUniqueStudents: number;
};

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

function normaliseUnitCode(code: string) {
  return code.trim().toUpperCase();
}

function splitRules(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

export function getUnitsDb(): Record<string, UnitRecord> {
  return readJson<Record<string, UnitRecord>>(UNITS_PATH, {});
}

export function getRecentUnits(limit = 8) {
  const units = Object.values(getUnitsDb());
  return units
    .sort((a, b) => b.code.localeCompare(a.code))
    .slice(0, limit)
    .map((unit) => ({
      code: unit.code,
      title: unit.title,
      school: unit.school || unit.academic_org || "",
      level: unit.level,
      creditPoints: unit.credit_points,
    }));
}

export function addUnitToDataset(input: NewUnitInput) {
  const code = normaliseUnitCode(input.code);
  if (!/^[A-Z]{2,4}\d{4}$/.test(code)) {
    throw new Error("Unit code must look like FIT1008.");
  }

  const units = getUnitsDb();
  if (units[code]) {
    throw new Error(`${code} already exists.`);
  }

  const school = input.school.trim();
  const academicOrg = input.academicOrg.trim() || school;
  const period = input.period.trim();
  const location = input.location.trim();
  const mode = input.mode.trim();

  const nextUnits = {
    ...units,
    [code]: {
      academic_org: academicOrg,
      assessments: [],
      code,
      credit_points: String(input.creditPoints || 6),
      level: input.level || 1,
      offerings: period
        ? [
            {
              location,
              mode,
              name: [period, location, mode].filter(Boolean).join("-"),
              period,
            },
          ]
        : [],
      requisites: {
        permission: false,
        prerequisites: splitRules(input.prerequisites),
        corequisites: [],
        prohibitions: [],
        cp_required: 0,
      },
      sca_band: 0,
      school,
      title: input.title.trim(),
      overview: input.overview.trim(),
    },
  };

  const sortedUnits = Object.fromEntries(
    Object.entries(nextUnits).sort(([a], [b]) => a.localeCompare(b)),
  );

  writeFileSync(UNITS_PATH, `${JSON.stringify(sortedUnits, null, 2)}\n`);
  return code;
}

function readPeriodEnrolments(fileName: string) {
  const raw = readJson<{ enrolments?: EnrolmentRecord[] }>(
    path.join(STUDENT_DATA_DIR, "enrolments", fileName),
    { enrolments: [] },
  );
  return raw.enrolments ?? [];
}

function countStudents(enrolments: EnrolmentRecord[]) {
  const map = new Map<string, Set<string>>();

  for (const enrolment of enrolments) {
    const code = normaliseUnitCode(String(enrolment.unit_code ?? ""));
    const studentId = String(enrolment.student_id ?? "").trim();
    if (!code || !studentId) continue;
    if (!map.has(code)) map.set(code, new Set());
    map.get(code)!.add(studentId);
  }

  return map;
}

export function getUnitAnalytics(searchCode?: string): UnitAnalytics[] {
  const units = getUnitsDb();
  const currentCounts = countStudents(
    readPeriodEnrolments("current_semester.json"),
  );
  const previousCounts = countStudents(
    readPeriodEnrolments("previous_semester.json"),
  );
  const filterCode = searchCode ? normaliseUnitCode(searchCode) : "";
  const codes = new Set<string>([
    ...Object.keys(units),
    ...currentCounts.keys(),
    ...previousCounts.keys(),
  ]);

  return [...codes]
    .filter((code) => !filterCode || code.includes(filterCode))
    .map((code) => {
      const currentStudents = currentCounts.get(code) ?? new Set<string>();
      const previousStudents = previousCounts.get(code) ?? new Set<string>();
      const totalUniqueStudents = new Set([
        ...currentStudents,
        ...previousStudents,
      ]);
      const unit = units[code];

      return {
        code,
        title: unit?.title ?? "Unknown unit",
        school: unit?.school || unit?.academic_org || "",
        currentStudents: currentStudents.size,
        previousStudents: previousStudents.size,
        totalUniqueStudents: totalUniqueStudents.size,
      };
    })
    .sort(
      (a, b) =>
        b.currentStudents - a.currentStudents ||
        b.totalUniqueStudents - a.totalUniqueStudents ||
        a.code.localeCompare(b.code),
    );
}
