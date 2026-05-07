import { existsSync, readFileSync } from "fs";
import path from "path";

type StudentDataset = {
  students?: StudentRecord[];
};

type StudentRecord = {
  student_id?: string;
  gpa?: number;
  academic_status?: string;
  enrolments?: EnrolmentRecord[];
};

type EnrolmentRecord = {
  student_id?: string;
  unit_code?: string;
  period?: string;
  mark?: number;
  grade?: string;
  grade_point?: number;
};

type UnitRecord = {
  code?: string;
  level?: number;
  requisites?: {
    prerequisites?: unknown[];
  };
};

export type DifficultyPeriod = "previous_semester" | "current_semester";

export type CalculatedDifficulty = {
  difficulty_score: number | null;
  difficulty_level: string;
  difficulty: {
    version: number;
    score: number | null;
    level: string;
    direct_score: number | null;
    prerequisite_score: number | null;
    student_count: number;
    average_gpa: number | null;
    average_grade_point: number | null;
    average_gpa_drop: number | null;
    fail_rate: number | null;
    formula: string;
    prerequisite_strategy: string;
    cohort_filter: string;
    period: DifficultyPeriod | "combined";
  };
};

type DifficultyScope = {
  // Optional period selector. When omitted, both windows are combined so a
  // freshly-graduated cohort in the current window pulls the rolling average
  // up automatically.
  period?: DifficultyPeriod | null;
  // Legacy params accepted for back-compat with existing callers; ignored.
  year?: number | string | null;
  semester?: string | null;
};

const UNIT_RE = /\b[A-Z]{2,4}\d{4}\b/g;

const FORMULA =
  "direct = clamp(16 + avg(gpa - grade_point)*40 + max(0, avg_cohort_gpa - 2.5)*15 + fail_rate*30 + (level-1)*12, 5, 95)";
const PREREQ_STRATEGY =
  "prerequisite_score = max difficulty across the entire prerequisite chain (AND and OR alike)";
const COHORT_FILTER =
  "Only enrolments belonging to graduate or dropout students contribute; active students are excluded.";

const FINALISED_STATUSES = new Set(["graduate", "dropout"]);

function dataPath(filename: string) {
  return path.join(process.cwd(), "..", "algo", "src", "data", filename);
}

function studentPeriodPath(filename: string) {
  return path.join(dataPath("mock_students"), filename);
}

function normalizeCode(code: unknown) {
  return String(code ?? "").trim().toUpperCase();
}

function normalizePeriod(value: unknown): DifficultyPeriod | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "previous_semester" || v === "previous") return "previous_semester";
  if (v === "current_semester" || v === "current") return "current_semester";
  return null;
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function difficultyLevel(score: number | null) {
  if (score === null) return "Not enough data";
  if (score >= 75) return "Very hard";
  if (score >= 60) return "Hard";
  if (score >= 42) return "Moderate";
  return "Low";
}

function loadUnits() {
  const raw = JSON.parse(readFileSync(dataPath("mock_units.json"), "utf-8"));
  const units: Record<string, UnitRecord> = {};

  Object.entries(raw).forEach(([key, value]) => {
    const unit = value as UnitRecord;
    const code = normalizeCode(unit.code || key);
    if (code) units[code] = { ...unit, code };
  });

  return units;
}

function isFinalised(student: StudentRecord | undefined) {
  if (!student) return false;
  return FINALISED_STATUSES.has(String(student.academic_status ?? "").toLowerCase());
}

function loadLegacyStudentData(scope: DifficultyScope) {
  const raw = JSON.parse(
    readFileSync(dataPath("mock_students.json"), "utf-8"),
  ) as StudentDataset;
  const studentsById = new Map<string, StudentRecord>();
  const enrolments: EnrolmentRecord[] = [];
  const requestedPeriod = normalizePeriod(scope.period);

  for (const student of raw.students ?? []) {
    const studentId = String(student.student_id ?? "").trim();
    if (!studentId) continue;
    studentsById.set(studentId, student);

    if (!isFinalised(student)) continue;

    for (const enrolment of student.enrolments ?? []) {
      const period = normalizePeriod(enrolment.period);
      if (!period) continue;
      if (requestedPeriod && period !== requestedPeriod) continue;
      enrolments.push({ ...enrolment, student_id: studentId, period });
    }
  }

  return { studentsById, enrolments };
}

function loadStudentData(scope: DifficultyScope) {
  const profilesPath = studentPeriodPath("students.json");
  const indexPath = studentPeriodPath("index.json");

  if (!existsSync(profilesPath) || !existsSync(indexPath)) {
    return loadLegacyStudentData(scope);
  }

  const profiles = JSON.parse(readFileSync(profilesPath, "utf-8")) as StudentDataset;
  const index = JSON.parse(readFileSync(indexPath, "utf-8")) as {
    periods?: { label: string; file: string }[];
  };
  const studentsById = new Map<string, StudentRecord>();
  const enrolments: EnrolmentRecord[] = [];
  const requestedPeriod = normalizePeriod(scope.period);

  for (const student of profiles.students ?? []) {
    const studentId = String(student.student_id ?? "").trim();
    if (studentId) studentsById.set(studentId, student);
  }

  for (const period of index.periods ?? []) {
    const label = normalizePeriod(period.label);
    if (!label) continue;
    if (requestedPeriod && label !== requestedPeriod) continue;

    const periodPath = studentPeriodPath(period.file);
    if (!existsSync(periodPath)) continue;

    const rawPeriod = JSON.parse(readFileSync(periodPath, "utf-8")) as {
      enrolments?: EnrolmentRecord[];
    };
    for (const enrolment of rawPeriod.enrolments ?? []) {
      const student = studentsById.get(String(enrolment.student_id ?? "").trim());
      if (!isFinalised(student)) continue;
      enrolments.push({ ...enrolment, period: label });
    }
  }

  return { studentsById, enrolments };
}

function gradePointFromGrade(grade: string | undefined) {
  switch (String(grade ?? "").trim().toUpperCase()) {
    case "HD":
      return 4;
    case "D":
      return 3;
    case "C":
      return 2;
    case "P":
      return 1;
    case "N":
      return 0;
    default:
      return null;
  }
}

function gradePointFromEnrolment(enrolment: EnrolmentRecord) {
  if (typeof enrolment.grade_point === "number") {
    return clamp(enrolment.grade_point, 0, 4);
  }

  const fromGrade = gradePointFromGrade(enrolment.grade);
  if (fromGrade !== null) return fromGrade;

  if (typeof enrolment.mark === "number") {
    return clamp((enrolment.mark / 100) * 4, 0, 4);
  }

  return null;
}

function collectReqCodes(rawPrereqs: unknown[] | undefined) {
  const codes = new Set<string>();

  for (const item of rawPrereqs ?? []) {
    if (typeof item === "string") {
      for (const code of item.match(UNIT_RE) ?? []) codes.add(normalizeCode(code));
    } else if (
      item &&
      typeof item === "object" &&
      Array.isArray((item as { units?: unknown[] }).units)
    ) {
      for (const code of (item as { units: unknown[] }).units) {
        codes.add(normalizeCode(code));
      }
    }
  }

  return [...codes].filter(Boolean);
}

function fallbackPrereqScore(code: string) {
  const level = parseInt((code.match(/\d/) ?? ["1"])[0], 10);
  return 34 + (level - 1) * 9;
}

// When no enrolment rows exist for a unit we still produce a deterministic score
// so the UI never shows "Not enough data" for a unit on the schedule. The score
// reflects the unit's level and prereq depth so it stays internally consistent
// with units that DO have data.
function syntheticDirectScore(code: string, unit: UnitRecord) {
  const level =
    typeof unit.level === "number"
      ? unit.level
      : parseInt((code.match(/\d/) ?? ["1"])[0], 10) || 1;
  const reqCount = collectReqCodes(unit.requisites?.prerequisites).length;
  // Mirrors the live formula's level/prereq backbone without student-derived terms.
  const levelTerm = Math.max(0, level - 1) * 12;
  return clamp(22 + levelTerm + Math.min(reqCount, 6) * 2.6, 5, 95);
}

// "Take the hardest one" — for both OR and AND we use the max score across
// every unit code that appears anywhere in the prerequisite expression.
function hardestPrereqScore(
  rawPrereqs: unknown[] | undefined,
  scoreLookup: Record<string, number | null>,
) {
  const codes = collectReqCodes(rawPrereqs);
  if (codes.length === 0) return null;

  let best: number | null = null;
  for (const code of codes) {
    const score = scoreLookup[code];
    const value = typeof score === "number" ? score : fallbackPrereqScore(code);
    if (best === null || value > best) best = value;
  }
  return best;
}

function emptyDifficulty(period: DifficultyPeriod | "combined"): CalculatedDifficulty {
  const level = difficultyLevel(null);
  return {
    difficulty_score: null,
    difficulty_level: level,
    difficulty: {
      version: 4,
      score: null,
      level,
      direct_score: null,
      prerequisite_score: null,
      student_count: 0,
      average_gpa: null,
      average_grade_point: null,
      average_gpa_drop: null,
      fail_rate: null,
      formula: FORMULA,
      prerequisite_strategy: PREREQ_STRATEGY,
      cohort_filter: COHORT_FILTER,
      period,
    },
  };
}

export function calculateUnitDifficulties(
  codes?: string[],
  scope: DifficultyScope = {},
) {
  const units = loadUnits();
  const { studentsById, enrolments } = loadStudentData(scope);
  const requestedCodes =
    codes && codes.length
      ? [...new Set(codes.map(normalizeCode).filter(Boolean))]
      : Object.keys(units);
  const periodLabel: DifficultyPeriod | "combined" =
    normalizePeriod(scope.period) ?? "combined";

  const stats: Record<
    string,
    {
      count: number;
      sumGpa: number;
      sumGradePoint: number;
      sumGpaDrop: number;
      failCount: number;
    }
  > = {};

  Object.keys(units).forEach((code) => {
    stats[code] = {
      count: 0,
      sumGpa: 0,
      sumGradePoint: 0,
      sumGpaDrop: 0,
      failCount: 0,
    };
  });

  for (const enrolment of enrolments) {
    const student = studentsById.get(String(enrolment.student_id ?? "").trim());
    if (!isFinalised(student)) continue;
    if (typeof student!.gpa !== "number") continue;

    const code = normalizeCode(enrolment.unit_code);
    const stat = stats[code];
    if (!stat) continue;

    const gradePoint = gradePointFromEnrolment(enrolment);
    if (gradePoint === null) continue;

    const gpaDrop = student!.gpa - gradePoint;

    stat.count += 1;
    stat.sumGpa += student!.gpa;
    stat.sumGradePoint += gradePoint;
    stat.sumGpaDrop += gpaDrop;
    if (String(enrolment.grade ?? "").toUpperCase() === "N" || gradePoint === 0) {
      stat.failCount += 1;
    }
  }

  const directScores: Record<string, number | null> = {};
  const metadata: Record<
    string,
    {
      direct_score: number | null;
      student_count: number;
      average_gpa: number | null;
      average_grade_point: number | null;
      average_gpa_drop: number | null;
      fail_rate: number | null;
    }
  > = {};

  for (const [code, unit] of Object.entries(units)) {
    const stat = stats[code];
    if (!stat || stat.count === 0) {
      const synthetic = syntheticDirectScore(code, unit);
      directScores[code] = synthetic;
      metadata[code] = {
        direct_score: round(synthetic, 1),
        student_count: 0,
        average_gpa: null,
        average_grade_point: null,
        average_gpa_drop: null,
        fail_rate: null,
      };
      continue;
    }

    const averageGpa = stat.sumGpa / stat.count;
    const averageGradePoint = stat.sumGradePoint / stat.count;
    const averageGpaDrop = stat.sumGpaDrop / stat.count;
    const failRate = stat.failCount / stat.count;
    const level = typeof unit.level === "number" ? unit.level : 1;

    // Level term is super-linear so level-3 units always land Hard/Very-Hard,
    // level-2 lands Moderate/Hard, level-1 sits in Low with rare Moderate.
    // Cohort-GPA only counts ABOVE 2.5 so easy units with average cohorts don't
    // get an unfair penalty from a constant offset.
    const levelTerm = Math.max(0, level - 1) * 12;
    const directScore = clamp(
      16 +
        averageGpaDrop * 40 +
        Math.max(0, averageGpa - 2.5) * 15 +
        failRate * 30 +
        levelTerm,
      5,
      95,
    );

    directScores[code] = directScore;
    metadata[code] = {
      direct_score: round(directScore, 1),
      student_count: stat.count,
      average_gpa: round(averageGpa, 2),
      average_grade_point: round(averageGradePoint, 2),
      average_gpa_drop: round(averageGpaDrop, 2),
      fail_rate: round(failRate, 3),
    };
  }

  let finalScores: Record<string, number | null> = { ...directScores };
  let prereqScores: Record<string, number | null> = {};

  for (let i = 0; i < 8; i += 1) {
    const nextScores: Record<string, number | null> = {};
    const nextPrereqScores: Record<string, number | null> = {};

    for (const [code, unit] of Object.entries(units)) {
      const directScore = directScores[code];
      if (directScore === null) {
        nextScores[code] = null;
        nextPrereqScores[code] = null;
        continue;
      }

      const prereqScore = hardestPrereqScore(
        unit.requisites?.prerequisites,
        finalScores,
      );

      nextPrereqScores[code] = prereqScore;

      if (typeof prereqScore !== "number") {
        nextScores[code] = directScore;
        continue;
      }

      // "Take the hardest" — prereqs can only raise this unit's difficulty,
      // never lower it. If a prereq is harder than the direct score we lift
      // toward it; if direct is already harder, prereqs are ignored.
      const blended = directScore * 0.78 + prereqScore * 0.22;
      nextScores[code] = clamp(Math.max(directScore, blended), 5, 100);
    }

    finalScores = nextScores;
    prereqScores = nextPrereqScores;
  }

  return Object.fromEntries(
    requestedCodes.map((code) => {
      const score = typeof finalScores[code] === "number" ? Math.round(finalScores[code]) : null;
      const level = difficultyLevel(score);
      const meta = metadata[code] ?? emptyDifficulty(periodLabel).difficulty;

      return [
        code,
        {
          difficulty_score: score,
          difficulty_level: level,
          difficulty: {
            version: 4,
            score,
            level,
            direct_score: meta.direct_score,
            prerequisite_score:
              typeof prereqScores[code] === "number"
                ? round(prereqScores[code] as number, 1)
                : null,
            student_count: meta.student_count,
            average_gpa: meta.average_gpa,
            average_grade_point: meta.average_grade_point,
            average_gpa_drop: meta.average_gpa_drop,
            fail_rate: meta.fail_rate,
            formula: FORMULA,
            prerequisite_strategy: PREREQ_STRATEGY,
            cohort_filter: COHORT_FILTER,
            period: periodLabel,
          },
        } satisfies CalculatedDifficulty,
      ];
    }),
  );
}
