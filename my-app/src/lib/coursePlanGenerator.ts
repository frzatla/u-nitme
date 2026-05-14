import { readFileSync } from "fs";
import path from "path";
import { getTypesenseClient, UNITS_COLLECTION } from "@/lib/typesense";
import { Plan, Schedule, UnitCategory } from "@/lib/types";

const DATA_DIR     = path.join(process.cwd(), "..", "algo", "src", "data");
const AOS_PATH     = path.join(DATA_DIR, "mock_aos.json");
const COURSES_PATH = path.join(DATA_DIR, "mock_courses.json");
const MOCK_UNITS_PATH = path.join(DATA_DIR, "mock_units.json");

export const NO_AREA_OF_STUDY_VALUE = "__NO_AREA_OF_STUDY__";

const ALGO_API_URL = process.env.ALGO_API_URL ?? "https://u-nitme-algo.vercel.app/api";

export type PlanGenerationInput = {
  planName: string;
  courseCode: string;
  university: string;
  areaOfStudy: string;
  interests: string[];
  semesterOffering: string;
  yearStart: number;
  yearEnd: number;
  minorMajorType?: string;
  minorMajorCode?: string;
};

async function runAlgo(
  courseCode: string,
  aosCode: string,
  standardYears?: number,
  minorMajorType?: string,
  minorMajorCode?: string,
): Promise<Schedule | null> {
  try {
    const body: Record<string, any> = {
      course: courseCode,
      campus: "Clayton",
    };
    if (aosCode) body.specialisation = aosCode;
    if (minorMajorType === "major" && minorMajorCode) body.major = minorMajorCode;
    if (minorMajorType === "minor" && minorMajorCode) body.minor = minorMajorCode;
    if (standardYears && Number.isFinite(standardYears)) body.years = standardYears;

    const res = await fetch(ALGO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("Algo API error:", res.status, await res.text());
      return null;
    }

    return await res.json() as Schedule;
  } catch (e) {
    console.error("Algo API call failed:", e);
    return null;
  }
}

const INTEREST_KEYWORDS: Record<string, string> = {
  AI: "artificial intelligence machine learning deep learning neural networks",
  "Problem Solving":
    "algorithms data structures problem solving computational mathematics",
  Cybersecurity:
    "cybersecurity security network forensics vulnerability malware",
  Data: "data analytics statistics data science databases visualisation",
  Software: "software engineering programming development agile systems",
  Design: "design user interface UX usability creative interaction",
  Business: "business management marketing economics entrepreneurship strategy",
  Pitching:
    "entrepreneurship startup venture pitching communication presentation",
  Leadership: "leadership management organisational change development",
  Communication: "communication writing media journalism language",
  Finance: "finance accounting economics investment financial banking",
  Health: "health psychology wellbeing cognitive behavioural",
  Sustainability:
    "sustainability environmental climate ecology renewable energy",
  Robotics: "robotics mechatronics embedded systems control automation",
  Games: "game design programming game prototyping interactive animation",
  Education: "education learning teaching research pedagogy",
};

function prereqsSatisfied(
  unitCode: string,
  unitsDb: Record<string, any>,
  completed: Set<string>,
): boolean {
  const unit = unitsDb[unitCode];
  if (!unit) return true;

  const prereqList: string[] = unit.requisites?.prerequisites ?? [];
  for (const rule of prereqList) {
    if (!rule) continue;
    const andGroups = rule.split("&").map((g) => g.replace(/[()]/g, "").trim());
    for (const orGroup of andGroups) {
      if (!orGroup) continue;
      const alternatives = orGroup
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean);
      if (alternatives.length && !alternatives.some((c) => completed.has(c))) {
        return false;
      }
    }
  }
  return true;
}

async function recommendElectives(
  interests: string[],
  schedule: Schedule,
  planUnitCodes: Set<string>,
  maxSemesters: number,
): Promise<{ schedule: Schedule; electiveCodes: Set<string> }> {
  if (interests.length === 0) return { schedule, electiveCodes: new Set() };

  try {
    const unitsDb: Record<string, any> = JSON.parse(
      readFileSync(MOCK_UNITS_PATH, "utf-8"),
    );

    const client = getTypesenseClient();
    const candidateMap = new Map<string, any>();

    for (const interest of interests) {
      const keyword = INTEREST_KEYWORDS[interest] ?? interest.toLowerCase();
      const result = await client.collections(UNITS_COLLECTION).documents().search({
        q:                keyword,
        query_by:         "title,overview,school",
        query_by_weights: "4,3,2",
        num_typos:        2,
        per_page:         15,
      });

      for (const hit of result.hits ?? []) {
        const s = hit.document as any;
        if (planUnitCodes.has(s.code) || s.code === "ELECTIVE") continue;
        if (!candidateMap.has(s.code)) {
          candidateMap.set(s.code, { ...s, _score: (hit as any).text_match ?? 0 });
        }
      }
    }

    const candidates = Array.from(candidateMap.values()).sort(
      (a, b) => b._score - a._score || (a.level ?? 1) - (b.level ?? 1),
    );

    const updatedSemesters = schedule.schedule.map((s) => ({
      ...s,
      units: [...s.units],
    }));
    const usedCodes = new Set<string>();
    const electiveCodes = new Set<string>();
    const completedSoFar = new Set<string>();

    for (let semIdx = 0; semIdx < updatedSemesters.length; semIdx++) {
      const sem = updatedSemesters[semIdx];
      if (!sem.period) continue;
      if (sem.semester_index > maxSemesters) continue;

      const maxLevel =
        sem.semester_index <= 1 ? 1 : sem.semester_index <= 3 ? 2 : 3;

      for (let unitIdx = 0; unitIdx < sem.units.length; unitIdx++) {
        if (sem.units[unitIdx].code !== "ELECTIVE") continue;

        const candidate = candidates.find(
          (c) =>
            !usedCodes.has(c.code) &&
            (c.level ?? 1) <= maxLevel &&
            prereqsSatisfied(c.code, unitsDb, completedSoFar),
        );
        if (!candidate) continue;

        usedCodes.add(candidate.code);
        electiveCodes.add(candidate.code);
        sem.units[unitIdx] = {
          code: candidate.code,
          title: candidate.title ?? "",
          credit_points: parseInt(String(candidate.credit_points)) || 6,
          level: candidate.level ?? 1,
          chain_length: null,
          extended: null,
          category: "Elective" as UnitCategory,
        };
      }

      for (const unit of sem.units) {
        if (unit.code !== "ELECTIVE") completedSoFar.add(unit.code);
      }
    }

    return {
      schedule: { ...schedule, schedule: updatedSemesters },
      electiveCodes,
    };
  } catch (err) {
    console.error("recommendElectives error:", err);
    return { schedule, electiveCodes: new Set() };
  }
}

function collapseOverflow(schedule: Schedule, maxSemesters: number): Schedule {
  const sems = schedule.schedule.map((s) => ({ ...s, units: [...s.units] }));
  const overflowSems = sems.filter(
    (s) => s.period !== null && s.semester_index > maxSemesters,
  );
  if (overflowSems.length === 0) return schedule;

  const overflowUnits = overflowSems.flatMap((s) =>
    s.units.filter((u) => u.code !== "ELECTIVE"),
  );

  if (overflowUnits.length > 0) {
    const plannedSems = sems
      .filter((s) => s.period !== null && s.semester_index <= maxSemesters)
      .reverse();

    for (const unit of overflowUnits) {
      let placed = false;
      for (const sem of plannedSems) {
        const electiveIdx = sem.units.findIndex((u) => u.code === "ELECTIVE");
        if (electiveIdx >= 0) {
          sem.units[electiveIdx] = unit;
          placed = true;
          break;
        }
      }
      if (!placed && plannedSems.length > 0) {
        plannedSems[0].units.push(unit);
      }
    }
  }

  const filteredSems = sems.filter(
    (s) => s.period === null || s.semester_index <= maxSemesters,
  );
  return { ...schedule, schedule: filteredSems };
}

function enrichCategories(
  schedule: Schedule,
  courseCode: string,
  aosCode: string,
  minorMajorType?: string,
  minorMajorCode?: string,
  electiveUnitCodes: Set<string> = new Set(),
): Schedule {
  let coreUnits = new Set<string>();
  let aosUnits = new Set<string>();
  let minorMajorUnits = new Set<string>();

  try {
    const coursesRaw = JSON.parse(readFileSync(COURSES_PATH, "utf-8"));
    const courseEntry = coursesRaw[courseCode];
    const req2 = (courseEntry?.requirement_groups ?? []).find(
      (g: any) => g.id === "req_2",
    );
    if (req2?.units?.length) coreUnits = new Set<string>(req2.units);

    const aosRaw = JSON.parse(readFileSync(AOS_PATH, "utf-8"));
    const aosEntry = aosRaw[aosCode];
    if (aosEntry?.all_units) aosUnits = new Set(Object.keys(aosEntry.all_units));

    if (minorMajorCode) {
      const mmEntry = aosRaw[minorMajorCode];
      if (mmEntry?.all_units) {
        minorMajorUnits = new Set(Object.keys(mmEntry.all_units));
      }
    }
  } catch (_) {}

  const enriched = schedule.schedule.map((sem) => ({
    ...sem,
    units: sem.units.map((unit) => {
      let category: UnitCategory = "Core";
      if (unit.code === "ELECTIVE") {
        category = "Elective";
      } else if (electiveUnitCodes.has(unit.code)) {
        category = "Elective";
      } else if (minorMajorUnits.has(unit.code)) {
        category = minorMajorType === "minor" ? "Minor" : "Major";
      } else if (coreUnits.has(unit.code)) {
        category = "Core";
      } else if (aosUnits.has(unit.code)) {
        category = "Specialisation";
      }
      return { ...unit, category };
    }),
  }));

  return { ...schedule, schedule: enriched };
}

export function getDurationYears(yearStart: number, yearEnd: number) {
  if (!Number.isFinite(yearStart) || !Number.isFinite(yearEnd)) return undefined;
  if (yearEnd <= yearStart) return undefined;
  return Math.min(7, Math.max(2, yearEnd - yearStart));
}

export async function buildGeneratedPlan(
  id: string,
  input: PlanGenerationInput,
  saved = false,
): Promise<Plan> {
  const yearStart = Number(input.yearStart);
  const yearEnd = Number(input.yearEnd);
  const durationYears = getDurationYears(yearStart, yearEnd);
  const maxSemesters = (yearEnd - yearStart + 1) * 2;

  const plan: Plan = {
    id,
    planName: input.planName,
    courseCode: input.courseCode,
    university: input.university,
    areaOfStudy: input.areaOfStudy,
    interests: input.interests,
    semesterOffering: input.semesterOffering,
    yearStart,
    yearEnd,
    saved,
  };

  let rawSchedule = await runAlgo(
    input.courseCode,
    input.areaOfStudy,
    durationYears,
    input.minorMajorType || undefined,
    input.minorMajorCode || undefined,
  );

  if (rawSchedule) rawSchedule = collapseOverflow(rawSchedule, maxSemesters);

  let electiveCodes = new Set<string>();
  if (rawSchedule && input.interests.length > 0) {
    const planCodes = new Set<string>(
      rawSchedule.schedule
        .flatMap((s) => s.units.map((u) => u.code))
        .filter((c) => c !== "ELECTIVE"),
    );
    const result = await recommendElectives(
      input.interests,
      rawSchedule,
      planCodes,
      maxSemesters,
    );
    rawSchedule = result.schedule;
    electiveCodes = result.electiveCodes;
  }

  if (rawSchedule) {
    plan.schedule = enrichCategories(
      rawSchedule,
      input.courseCode,
      input.areaOfStudy,
      input.minorMajorType || undefined,
      input.minorMajorCode || undefined,
      electiveCodes,
    );
  }

  return plan;
}
