#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const UNITS_PATH = path.join(DATA_DIR, "mock_units.json");
const STUDENTS_PATH = path.join(DATA_DIR, "mock_students.json");
const STUDENTS_DIR = path.join(DATA_DIR, "mock_students");
const STUDENT_PROFILES_PATH = path.join(STUDENTS_DIR, "students.json");
const STUDENT_ENROLMENTS_DIR = path.join(STUDENTS_DIR, "enrolments");

// Difficulty is calculated from finalised cohorts only — students whose final
// outcome (graduate or dropout) is on the books. Active students are kept as
// part of the cohort for realism but they don't generate enrolment rows.
const STUDENT_COUNTS = [
  { band: "developing", status: "active",   count: 18, minGpa: 1.75, maxGpa: 2.55 },
  { band: "steady",     status: "active",   count: 30, minGpa: 2.45, maxGpa: 3.15 },
  { band: "strong",     status: "active",   count: 26, minGpa: 3.05, maxGpa: 3.65 },
  { band: "high",       status: "active",   count: 16, minGpa: 3.6,  maxGpa: 4.0  },
  { band: "developing", status: "graduate", count: 30, minGpa: 1.85, maxGpa: 2.55 },
  { band: "steady",     status: "graduate", count: 60, minGpa: 2.55, maxGpa: 3.15 },
  { band: "strong",     status: "graduate", count: 70, minGpa: 3.05, maxGpa: 3.65 },
  { band: "high",       status: "graduate", count: 40, minGpa: 3.55, maxGpa: 3.95 },
  { band: "developing", status: "dropout",  count: 60, minGpa: 1.30, maxGpa: 2.30 },
  { band: "steady",     status: "dropout",  count: 40, minGpa: 2.20, maxGpa: 2.85 },
];

const PERIOD_LABELS = ["previous_semester", "current_semester"];
const UNIT_RE = /\b[A-Z]{2,4}\d{4}\b/g;

// Curated calibration — well-known reputations within FIT/MAT.
// Boost latent load for famously brutal units, dampen for friendly intros.
// These nudges layer on top of level/prereq/assessment-driven load and make
// same-level variation match real-world expectations.
const KNOWN_HARD_BOOST = {
  // Algorithms / theory family — hard regardless of nominal level.
  // Target landing zone is "Very Hard" (>=75) for the famously brutal ones.
  FIT2004: 0.42, // Algorithms & data structures
  FIT2014: 0.44, // Theory of computation
  FIT2102: 0.40, // Programming paradigms
  FIT3155: 0.36, // Advanced algorithms
  FIT3171: 0.28, // Databases
  FIT3173: 0.30, // Software security
  FIT3175: 0.20, // Usability
  FIT3047: 0.26, // Industry experience studio
  MAT1830: 0.20, // Discrete maths
};

const KNOWN_EASY_NUDGE = {
  // Intro-friendly programming and breadth units
  FIT1045: 0.16, // Intro to programming — meant to be the gentlest entry
  FIT1043: 0.14, // Intro to data science
  FIT1056: 0.12, // Intro to web dev
  FIT1048: 0.12,
  FIT1049: 0.14,
  FIT1051: 0.12,
};

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

  // Wide noise (-0.18..+0.18) so two units at the same level differ a lot —
  // mimics the real-world spread between, say, an easy elective and a brutal
  // algorithms course at the same level.
  let load =
    0.10 +
    (level - 1) * 0.16 +
    Math.min(reqCodes.length, 10) * 0.028 +
    Math.min(assessments.count, 8) * 0.016 +
    assessments.examCount * 0.028 +
    randomBetween(`${code}:latent`, -0.18, 0.18);

  if (KNOWN_HARD_BOOST[code]) load += KNOWN_HARD_BOOST[code];
  if (KNOWN_EASY_NUDGE[code]) load -= KNOWN_EASY_NUDGE[code];

  return clamp(load, 0.02, 0.95);
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

// Bias graduates slightly toward "current_semester" (they just finished) and
// dropouts slightly toward "previous_semester" (a bit of distance since they
// left). Active students don't generate enrolments at all.
function pickPeriod(seed, status) {
  const r = random01(seed);
  if (status === "graduate") return r < 0.55 ? "current_semester" : "previous_semester";
  if (status === "dropout")  return r < 0.45 ? "current_semester" : "previous_semester";
  return r < 0.5 ? "current_semester" : "previous_semester";
}

function attachEnrolments(units, students) {
  const codes = Object.keys(units).sort();
  const finalisedStudents = students.filter(
    (s) => s.academic_status === "graduate" || s.academic_status === "dropout",
  );

  for (const code of codes) {
    const unit = units[code];
    const level = inferLevel(code, unit);
    const latentLoad = unitLatentLoad(code, unit);
    const reqCount = collectReqCodes(unit.requisites?.prerequisites).length;
    const enrolmentCount = Math.round(randomBetween(`${code}:count`, 14, 24));
    const selectivity = clamp(
      latentLoad * 0.62 + (level - 1) * 0.08 + reqCount * 0.012,
      0,
      0.88,
    );

    const selected = [...finalisedStudents]
      .sort((a, b) => {
        const aLoadPenalty = Math.max(0, a.enrolments.length - 28) * 0.035;
        const bLoadPenalty = Math.max(0, b.enrolments.length - 28) * 0.035;
        const aDropoutPenalty = a.academic_status === "dropout" && level >= 3 ? 0.22 : 0;
        const bDropoutPenalty = b.academic_status === "dropout" && level >= 3 ? 0.22 : 0;
        const aScore =
          random01(`${code}:${a.student_id}:pick`) +
          selectivity * ((a.gpa - 2.45) / 1.55) -
          aLoadPenalty -
          aDropoutPenalty;
        const bScore =
          random01(`${code}:${b.student_id}:pick`) +
          selectivity * ((b.gpa - 2.45) / 1.55) -
          bLoadPenalty -
          bDropoutPenalty;
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
        period: pickPeriod(`${student.student_id}:${code}:period`, student.academic_status),
        mark,
        grade: gradeFromMark(mark),
        grade_point: gradePoint,
      });
    }
  }

  for (const student of students) {
    student.enrolments.sort(
      (a, b) =>
        a.period.localeCompare(b.period) ||
        a.unit_code.localeCompare(b.unit_code),
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
        version: 2,
        generated_by: "algo/src/generate_mock_students.js",
        students: profiles,
      },
      null,
      2,
    )}\n`,
  );

  const periodMap = new Map(PERIOD_LABELS.map((label) => [label, []]));
  for (const student of students) {
    for (const enrolment of student.enrolments) {
      const bucket = periodMap.get(enrolment.period);
      if (!bucket) continue;
      bucket.push({
        student_id: student.student_id,
        ...enrolment,
      });
    }
  }

  const periods = PERIOD_LABELS.map((label) => {
    const enrolments = periodMap.get(label) ?? [];
    enrolments.sort(
      (a, b) =>
        a.student_id.localeCompare(b.student_id) ||
        a.unit_code.localeCompare(b.unit_code),
    );

    const file = `enrolments/${label}.json`;
    fs.writeFileSync(
      path.join(STUDENTS_DIR, file),
      `${JSON.stringify(
        {
          version: 2,
          label,
          enrolments,
        },
        null,
        2,
      )}\n`,
    );

    return {
      label,
      file,
      enrolment_count: enrolments.length,
    };
  });

  fs.writeFileSync(
    path.join(STUDENTS_DIR, "index.json"),
    `${JSON.stringify(
      {
        version: 2,
        generated_by: "algo/src/generate_mock_students.js",
        note:
          "Difficulty is computed from these two rolling windows (previous_semester + current_semester) over graduate and dropout students only.",
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
    version: 3,
    generated_by: "algo/src/generate_mock_students.js",
    gpa_scale: "0.00-4.00",
    grade_point_scale: "0.00-4.00",
    mark_scale: "0-100",
    formula_note:
      "Difficulty is calculated at request time from these transcripts. Only enrolments belonging to graduate or dropout students contribute; data is split into two rolling windows (previous_semester + current_semester).",
    students,
  };

  fs.writeFileSync(STUDENTS_PATH, `${JSON.stringify(studentDataset, null, 2)}\n`);

  const finalisedCount = students.filter(
    (s) => s.academic_status === "graduate" || s.academic_status === "dropout",
  ).length;
  const totalEnrolments = students.reduce((sum, s) => sum + s.enrolments.length, 0);
  console.log(
    `Generated ${students.length} mock students (${finalisedCount} contribute to difficulty) ` +
      `with ${totalEnrolments} enrolments across ${Object.keys(units).length} units.`,
  );
}

main();
