#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const UNITS_PATH = path.join(DATA_DIR, "mock_units.json");
const STUDENTS_PATH = path.join(DATA_DIR, "mock_students.json");
const STUDENTS_DIR = path.join(DATA_DIR, "mock_students");
const STUDENT_PROFILES_PATH = path.join(STUDENTS_DIR, "students.json");
const STUDENT_ENROLMENTS_DIR = path.join(STUDENTS_DIR, "enrolments");

const STUDENT_COUNTS = [
  { band: "developing", status: "active", count: 18, minGpa: 1.75, maxGpa: 2.55 },
  { band: "steady", status: "active", count: 34, minGpa: 2.45, maxGpa: 3.15 },
  { band: "strong", status: "active", count: 30, minGpa: 3.05, maxGpa: 3.65 },
  { band: "high", status: "active", count: 18, minGpa: 3.6, maxGpa: 4.0 },
  { band: "strong", status: "graduate", count: 26, minGpa: 3.0, maxGpa: 3.8 },
  { band: "developing", status: "dropout", count: 18, minGpa: 1.35, maxGpa: 2.45 },
];

const UNIT_RE = /\b[A-Z]{2,4}\d{4}\b/g;

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random01(seed) {
  return hashString(seed) / 0xffffffff;
}

function randomBetween(seed, min, max) {
  return min + random01(seed) * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeUnits(units) {
  const normalized = {};
  for (const [rawCode, rawUnit] of Object.entries(units)) {
    const code = String(rawUnit.code || rawCode).trim();
    if (!code) continue;
    normalized[code] = { ...rawUnit, code };
  }
  return normalized;
}

function inferLevel(code, unit) {
  if (typeof unit.level === "number") return unit.level;
  const match = code.match(/\d/);
  return match ? parseInt(match[0], 10) : 1;
}

function collectReqCodes(rawPrereqs) {
  const codes = new Set();
  for (const item of rawPrereqs ?? []) {
    if (typeof item === "string") {
      for (const code of item.match(UNIT_RE) ?? []) codes.add(code.trim());
    } else if (item && Array.isArray(item.units)) {
      for (const code of item.units) codes.add(String(code).trim());
    }
  }
  return [...codes];
}

function assessmentComplexity(unit) {
  const assessments = unit.assessments ?? [];
  const examCount = assessments.filter((a) =>
    String(a.type || a.name || "").toLowerCase().includes("exam"),
  ).length;
  return { count: assessments.length, examCount };
}

function unitLatentLoad(code, unit) {
  const level = inferLevel(code, unit);
  const reqCodes = collectReqCodes(unit.requisites?.prerequisites);
  const assessments = assessmentComplexity(unit);

  return clamp(
    0.16 +
      (level - 1) * 0.14 +
      Math.min(reqCodes.length, 10) * 0.026 +
      Math.min(assessments.count, 8) * 0.015 +
      assessments.examCount * 0.025 +
      randomBetween(`${code}:latent`, -0.055, 0.065),
    0.05,
    0.9,
  );
}

function createStudents() {
  const students = [];
  let id = 1;

  for (const group of STUDENT_COUNTS) {
    for (let i = 0; i < group.count; i += 1) {
      const studentId = `S${String(id).padStart(4, "0")}`;
      const gpa = round(
        randomBetween(
          `${studentId}:${group.band}:${group.status}:gpa`,
          group.minGpa,
          group.maxGpa,
        ),
        2,
      );
      students.push({
        student_id: studentId,
        display_name: `Mock Student ${String(id).padStart(3, "0")}`,
        cohort_band: group.band,
        academic_status: group.status,
        gpa,
        enrolments: [],
      });
      id += 1;
    }
  }

  return students;
}

function gradeFromMark(mark) {
  if (mark >= 80) return "HD";
  if (mark >= 70) return "D";
  if (mark >= 60) return "C";
  if (mark >= 50) return "P";
  return "N";
}

function markFromGradePoint(seed, gradePoint) {
  return Math.round(clamp(48 + gradePoint * 11 + randomBetween(seed, -3, 3), 0, 100));
}

function pickOfferingSemester(code, unit) {
  const periods = (unit.offerings ?? []).map((offering) =>
    String(offering.period || "").toLowerCase(),
  );
  const hasS1 = periods.some((period) => period.includes("first"));
  const hasS2 = periods.some((period) => period.includes("second"));
  if (hasS1 && hasS2) return random01(`${code}:semester`) > 0.5 ? "S1" : "S2";
  if (hasS2) return "S2";
  return "S1";
}

function attachEnrolments(units, students) {
  const codes = Object.keys(units).sort();

  for (const code of codes) {
    const unit = units[code];
    const level = inferLevel(code, unit);
    const latentLoad = unitLatentLoad(code, unit);
    const reqCount = collectReqCodes(unit.requisites?.prerequisites).length;
    const enrolmentCount = Math.round(randomBetween(`${code}:count`, 13, 23));
    const selectivity = clamp(latentLoad * 0.62 + (level - 1) * 0.08 + reqCount * 0.012, 0, 0.88);

    const selected = [...students]
      .sort((a, b) => {
        const aLoadPenalty = Math.max(0, a.enrolments.length - 34) * 0.035;
        const bLoadPenalty = Math.max(0, b.enrolments.length - 34) * 0.035;
        const aCompletionPenalty = a.academic_status === "dropout" && level >= 3 ? 0.22 : 0;
        const bCompletionPenalty = b.academic_status === "dropout" && level >= 3 ? 0.22 : 0;
        const aScore =
          random01(`${code}:${a.student_id}:pick`) +
          selectivity * ((a.gpa - 2.45) / 1.55) -
          aLoadPenalty -
          aCompletionPenalty;
        const bScore =
          random01(`${code}:${b.student_id}:pick`) +
          selectivity * ((b.gpa - 2.45) / 1.55) -
          bLoadPenalty -
          bCompletionPenalty;
        return bScore - aScore;
      })
      .slice(0, enrolmentCount);

    for (const student of selected) {
      const dropoutPenalty = student.academic_status === "dropout" ? 0.16 : 0;
      const expectedDrop = 0.12 + latentLoad * 0.82 + dropoutPenalty;
      const noise = randomBetween(`${student.student_id}:${code}:grade`, -0.32, 0.28);
      const gradePoint = round(clamp(student.gpa - expectedDrop + noise, 0, 4), 2);
      const mark = markFromGradePoint(`${student.student_id}:${code}:mark`, gradePoint);
      student.enrolments.push({
        unit_code: code,
        year: 2022 + Math.floor(randomBetween(`${student.student_id}:${code}:year`, 0, 4)),
        semester: pickOfferingSemester(code, unit),
        mark,
        grade: gradeFromMark(mark),
        grade_point: gradePoint,
      });
    }
  }

  for (const student of students) {
    student.enrolments.sort((a, b) =>
      a.year === b.year
        ? a.semester.localeCompare(b.semester) || a.unit_code.localeCompare(b.unit_code)
        : a.year - b.year,
    );
  }
}

function writeSegmentedStudentData(students) {
  fs.rmSync(STUDENTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(STUDENT_ENROLMENTS_DIR, { recursive: true });

  const profiles = students.map(({ enrolments, ...profile }) => profile);
  fs.writeFileSync(
    STUDENT_PROFILES_PATH,
    `${JSON.stringify(
      {
        version: 1,
        generated_by: "algo/src/generate_mock_students.js",
        students: profiles,
      },
      null,
      2,
    )}\n`,
  );

  const periodMap = new Map();
  for (const student of students) {
    for (const enrolment of student.enrolments) {
      const key = `${enrolment.year}-${enrolment.semester}`;
      if (!periodMap.has(key)) periodMap.set(key, []);
      periodMap.get(key).push({
        student_id: student.student_id,
        ...enrolment,
      });
    }
  }

  const periods = [...periodMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, enrolments]) => {
      const [year, semester] = key.split("-");
      enrolments.sort(
        (a, b) =>
          a.student_id.localeCompare(b.student_id) ||
          a.unit_code.localeCompare(b.unit_code),
      );

      const file = `enrolments/${key}.json`;
      fs.writeFileSync(
        path.join(STUDENTS_DIR, file),
        `${JSON.stringify(
          {
            version: 1,
            year: Number(year),
            semester,
            enrolments,
          },
          null,
          2,
        )}\n`,
      );

      return {
        year: Number(year),
        semester,
        file,
        enrolment_count: enrolments.length,
      };
    });

  fs.writeFileSync(
    path.join(STUDENTS_DIR, "index.json"),
    `${JSON.stringify(
      {
        version: 1,
        generated_by: "algo/src/generate_mock_students.js",
        note:
          "Difficulty is calculated at request time from these period files; no unit difficulty values are stored.",
        profile_file: "students.json",
        periods,
      },
      null,
      2,
    )}\n`,
  );
}

function main() {
  const units = normalizeUnits(JSON.parse(fs.readFileSync(UNITS_PATH, "utf-8")));
  const students = createStudents();

  attachEnrolments(units, students);
  writeSegmentedStudentData(students);

  const studentDataset = {
    version: 2,
    generated_by: "algo/src/generate_mock_students.js",
    gpa_scale: "0.00-4.00",
    grade_point_scale: "0.00-4.00",
    mark_scale: "0-100",
    formula_note:
      "Unit difficulty is intentionally not stored here or in mock_units.json. The web app calculates it from this transcript data at request time so new graduate/dropout/enrolment rows affect the result immediately.",
    students,
  };

  fs.writeFileSync(STUDENTS_PATH, `${JSON.stringify(studentDataset, null, 2)}\n`);

  console.log(`Generated ${students.length} mock students from ${Object.keys(units).length} units.`);
}

main();
