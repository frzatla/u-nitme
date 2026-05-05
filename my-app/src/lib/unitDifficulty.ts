import { existsSync, readFileSync } from "fs";
import path from "path";

type StudentDataset = {
  students?: StudentRecord[];
};

type StudentRecord = {
  student_id?: string;
  gpa?: number;
  enrolments?: EnrolmentRecord[];
};

type EnrolmentRecord = {
  student_id?: string;
  unit_code?: string;
  year?: number;
  semester?: string;
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
    average_grade_minus_gpa: number | null;
    weighted_grade_minus_gpa: number | null;
    weighted_grade_deficit: number | null;
    fail_rate: number | null;
    formula: string;
    prerequisite_strategy: string;
  };
};

type DifficultyScope = {
  year?: number | string | null;
  semester?: string | null;
};

const UNIT_RE = /\b[A-Z]{2,4}\d{4}\b/g;
const UNIT_TOKEN_RE = /^[A-Z]{2,4}\d{4}$/;

function dataPath(filename: string) {
  return path.join(process.cwd(), "..", "algo", "src", "data", filename);
}

function studentPeriodPath(filename: string) {
  return path.join(dataPath("mock_students"), filename);
}

function normalizeCode(code: unknown) {
  return String(code ?? "").trim().toUpperCase();
}

function normalizeSemester(semester: unknown) {
  const value = String(semester ?? "").trim().toUpperCase();
  if (value === "1" || value === "SEMESTER 1") return "S1";
  if (value === "2" || value === "SEMESTER 2") return "S2";
  return value === "S1" || value === "S2" ? value : "";
}

function normalizeYear(year: unknown) {
  const value = Number(year);
  return Number.isFinite(value) ? value : null;
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

function matchesScope(enrolment: EnrolmentRecord, scope: DifficultyScope) {
  const requestedYear = normalizeYear(scope.year);
  const requestedSemester = normalizeSemester(scope.semester);

  if (requestedYear !== null && enrolment.year !== requestedYear) return false;
  if (
    requestedSemester &&
    normalizeSemester(enrolment.semester) !== requestedSemester
  ) {
    return false;
  }

  return true;
}

function loadLegacyStudentData(scope: DifficultyScope) {
  const raw = JSON.parse(
    readFileSync(dataPath("mock_students.json"), "utf-8"),
  ) as StudentDataset;
  const studentsById = new Map<string, StudentRecord>();
  const enrolments: EnrolmentRecord[] = [];

  for (const student of raw.students ?? []) {
    const studentId = String(student.student_id ?? "").trim();
    if (!studentId) continue;
    studentsById.set(studentId, student);

    for (const enrolment of student.enrolments ?? []) {
      const scopedEnrolment = { ...enrolment, student_id: studentId };
      if (matchesScope(scopedEnrolment, scope)) {
        enrolments.push(scopedEnrolment);
      }
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
    periods?: { year: number; semester: string; file: string }[];
  };
  const studentsById = new Map<string, StudentRecord>();
  const enrolments: EnrolmentRecord[] = [];
  const requestedYear = normalizeYear(scope.year);
  const requestedSemester = normalizeSemester(scope.semester);

  for (const student of profiles.students ?? []) {
    const studentId = String(student.student_id ?? "").trim();
    if (studentId) studentsById.set(studentId, student);
  }

  for (const period of index.periods ?? []) {
    if (requestedYear !== null && period.year !== requestedYear) continue;
    if (requestedSemester && normalizeSemester(period.semester) !== requestedSemester) {
      continue;
    }

    const periodPath = studentPeriodPath(period.file);
    if (!existsSync(periodPath)) continue;

    const rawPeriod = JSON.parse(readFileSync(periodPath, "utf-8")) as {
      enrolments?: EnrolmentRecord[];
    };
    enrolments.push(...(rawPeriod.enrolments ?? []));
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

function tokenize(expression: string) {
  const tokens: string[] = [];
  const re = /\b[A-Z]{2,4}\d{4}\b|[&;()]/g;
  let match;
  while ((match = re.exec(expression))) tokens.push(match[0]);
  return tokens;
}

type ReqAst =
  | { type: "unit"; code: string }
  | { type: "and" | "or"; children: ReqAst[] };

function parseExpression(expression: string): ReqAst | null {
  const tokens = tokenize(expression);
  let pos = 0;

  function parsePrimary(): ReqAst | null {
    const token = tokens[pos];
    if (!token) return null;

    if (token === "(") {
      pos += 1;
      const node = parseOr();
      if (tokens[pos] === ")") pos += 1;
      return node;
    }

    if (UNIT_TOKEN_RE.test(token)) {
      pos += 1;
      return { type: "unit", code: normalizeCode(token) };
    }

    pos += 1;
    return null;
  }

  function parseAnd(): ReqAst | null {
    const children: ReqAst[] = [];
    const first = parsePrimary();
    if (first) children.push(first);

    while (tokens[pos] === "&") {
      pos += 1;
      const child = parsePrimary();
      if (child) children.push(child);
    }

    if (children.length === 0) return null;
    return children.length === 1 ? children[0] : { type: "and", children };
  }

  function parseOr(): ReqAst | null {
    const children: ReqAst[] = [];
    const first = parseAnd();
    if (first) children.push(first);

    while (tokens[pos] === ";") {
      pos += 1;
      const child = parseAnd();
      if (child) children.push(child);
    }

    if (children.length === 0) return null;
    return children.length === 1 ? children[0] : { type: "or", children };
  }

  return parseOr();
}

function fallbackPrereqScore(code: string) {
  const level = parseInt((code.match(/\d/) ?? ["1"])[0], 10);
  return 34 + (level - 1) * 9;
}

function evalAst(node: ReqAst | null, scoreLookup: Record<string, number | null>) {
  if (!node) return null;
  if (node.type === "unit") {
    return scoreLookup[node.code] ?? fallbackPrereqScore(node.code);
  }

  const childScores = node.children
    .map((child) => evalAst(child, scoreLookup))
    .filter((value): value is number => typeof value === "number");

  if (childScores.length === 0) return null;

  if (node.type === "or") return Math.max(...childScores);

  const avg = childScores.reduce((sum, value) => sum + value, 0) / childScores.length;
  const requiredLoadBonus = Math.min(10, Math.log2(childScores.length + 1) * 4);
  return clamp(avg + requiredLoadBonus, 0, 100);
}

function hardestPrerequisiteScore(
  rawPrereqs: unknown[] | undefined,
  scoreLookup: Record<string, number | null>,
) {
  const scores: number[] = [];

  for (const item of rawPrereqs ?? []) {
    let ast: ReqAst | null = null;
    if (typeof item === "string") {
      ast = parseExpression(item);
    } else if (
      item &&
      typeof item === "object" &&
      Array.isArray((item as { units?: unknown[] }).units)
    ) {
      ast = {
        type: "or",
        children: (item as { units: unknown[] }).units.map((code) => ({
          type: "unit",
          code: normalizeCode(code),
        })),
      };
    }

    const score = evalAst(ast, scoreLookup);
    if (typeof score === "number") scores.push(score);
  }

  return scores.length ? Math.max(...scores) : null;
}

function emptyDifficulty(): CalculatedDifficulty {
  const level = difficultyLevel(null);
  return {
    difficulty_score: null,
    difficulty_level: level,
    difficulty: {
      version: 2,
      score: null,
      level,
      direct_score: null,
      prerequisite_score: null,
      student_count: 0,
      average_gpa: null,
      average_grade_point: null,
      average_grade_minus_gpa: null,
      weighted_grade_minus_gpa: null,
      weighted_grade_deficit: null,
      fail_rate: null,
      formula:
        "runtime score uses -(grade_point - GPA) weighted by (1 + GPA / 4), then blends in the hardest prerequisite path",
      prerequisite_strategy:
        "OR prerequisite choices use the harder option; AND prerequisite branches combine required units",
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

  const stats: Record<
    string,
    {
      count: number;
      sumGpa: number;
      sumGradePoint: number;
      sumGradeMinusGpa: number;
      sumWeightedGradeMinusGpa: number;
      failCount: number;
    }
  > = {};

  Object.keys(units).forEach((code) => {
    stats[code] = {
      count: 0,
      sumGpa: 0,
      sumGradePoint: 0,
      sumGradeMinusGpa: 0,
      sumWeightedGradeMinusGpa: 0,
      failCount: 0,
    };
  });

  for (const enrolment of enrolments) {
    const student = studentsById.get(String(enrolment.student_id ?? "").trim());
    if (!student) continue;
    if (typeof student.gpa !== "number") continue;

    const code = normalizeCode(enrolment.unit_code);
    const stat = stats[code];
    if (!stat) continue;

    const gradePoint = gradePointFromEnrolment(enrolment);
    if (gradePoint === null) continue;

    const gradeMinusGpa = gradePoint - student.gpa;
    const weight = 1 + student.gpa / 4;

    stat.count += 1;
    stat.sumGpa += student.gpa;
    stat.sumGradePoint += gradePoint;
    stat.sumGradeMinusGpa += gradeMinusGpa;
    stat.sumWeightedGradeMinusGpa += gradeMinusGpa * weight;
    if (String(enrolment.grade ?? "").toUpperCase() === "N" || gradePoint === 0) {
      stat.failCount += 1;
    }
  }

  const directScores: Record<string, number | null> = {};
  const metadata: Record<string, Omit<CalculatedDifficulty["difficulty"], "version" | "score" | "level" | "prerequisite_score" | "formula" | "prerequisite_strategy">> = {};

  for (const [code, unit] of Object.entries(units)) {
    const stat = stats[code];
    if (!stat || stat.count === 0) {
      directScores[code] = null;
      metadata[code] = {
        direct_score: null,
        student_count: 0,
        average_gpa: null,
        average_grade_point: null,
        average_grade_minus_gpa: null,
        weighted_grade_minus_gpa: null,
        weighted_grade_deficit: null,
        fail_rate: null,
      };
      continue;
    }

    const averageGpa = stat.sumGpa / stat.count;
    const averageGradePoint = stat.sumGradePoint / stat.count;
    const averageGradeMinusGpa = stat.sumGradeMinusGpa / stat.count;
    const weightedGradeMinusGpa = stat.sumWeightedGradeMinusGpa / stat.count;
    const weightedDeficit = -weightedGradeMinusGpa;
    const failRate = stat.failCount / stat.count;
    const level = typeof unit.level === "number" ? unit.level : 1;

    const directScore = clamp(
      38 +
        weightedDeficit * 29 +
        failRate * 16 +
        (averageGpa - 2.6) * 3.5 +
        (level - 1) * 3.5,
      5,
      95,
    );

    directScores[code] = directScore;
    metadata[code] = {
      direct_score: round(directScore, 1),
      student_count: stat.count,
      average_gpa: round(averageGpa, 2),
      average_grade_point: round(averageGradePoint, 2),
      average_grade_minus_gpa: round(averageGradeMinusGpa, 2),
      weighted_grade_minus_gpa: round(weightedGradeMinusGpa, 2),
      weighted_grade_deficit: round(weightedDeficit, 2),
      fail_rate: round(failRate, 3),
    };
  }

  let finalScores = { ...directScores };
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

      const reqCodes = collectReqCodes(unit.requisites?.prerequisites);
      const prereqScore = hardestPrerequisiteScore(
        unit.requisites?.prerequisites,
        finalScores,
      );

      nextPrereqScores[code] = prereqScore;

      if (typeof prereqScore !== "number") {
        nextScores[code] = directScore;
        continue;
      }

      const dependencyBonus = Math.min(7, reqCodes.length * 0.55);
      nextScores[code] = clamp(
        directScore * 0.74 + prereqScore * 0.2 + dependencyBonus,
        5,
        100,
      );
    }

    finalScores = nextScores;
    prereqScores = nextPrereqScores;
  }

  return Object.fromEntries(
    requestedCodes.map((code) => {
      const score = typeof finalScores[code] === "number" ? Math.round(finalScores[code]) : null;
      const level = difficultyLevel(score);
      const meta = metadata[code] ?? emptyDifficulty().difficulty;

      return [
        code,
        {
          difficulty_score: score,
          difficulty_level: level,
          difficulty: {
            version: 2,
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
            average_grade_minus_gpa: meta.average_grade_minus_gpa,
            weighted_grade_minus_gpa: meta.weighted_grade_minus_gpa,
            weighted_grade_deficit: meta.weighted_grade_deficit,
            fail_rate: meta.fail_rate,
            formula:
              "runtime score uses -(grade_point - GPA) weighted by (1 + GPA / 4), then blends in the hardest prerequisite path",
            prerequisite_strategy:
              "OR prerequisite choices use the harder option; AND prerequisite branches combine required units",
          },
        } satisfies CalculatedDifficulty,
      ];
    }),
  );
}
