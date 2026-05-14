import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import StudentDetailsForm from "../../components/StudentDetailsForm";
import { redirect } from "next/navigation";
import { getProfileByEmail, updateProfile } from "@/lib/profile";
import {
  Plan,
  Profile,
  Schedule,
  ScheduledUnit,
  UnitCategory,
} from "@/lib/types";
import { spawnSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import path from "path";
import { savePendingPlan } from "@/lib/pendingPlan";
import { isAdminUser } from "@/lib/auth";
import { getTypesenseClient, UNITS_COLLECTION } from "@/lib/typesense";

const ALGO_DIR = path.join(process.cwd(), "..", "algo", "src");
const AOS_PATH = path.join(ALGO_DIR, "data", "mock_aos.json");
const COURSES_PATH = path.join(ALGO_DIR, "data", "mock_courses.json");
const MOCK_UNITS_PATH = path.join(ALGO_DIR, "data", "mock_units.json");
const NO_AREA_OF_STUDY_VALUE = "__NO_AREA_OF_STUDY__";

// On Windows try "py" first (Python Launcher); on other platforms try "python3" first yes
const PYTHON_COMMANDS =
  process.platform === "win32"
    ? ["py", "python", "python3"]
    : ["python3", "python", "py"];

function spawnPython(args: string[]): ReturnType<typeof spawnSync> {
  for (const cmd of PYTHON_COMMANDS) {
    const result = spawnSync(cmd, args, {
      cwd: ALGO_DIR,
      encoding: "utf-8",
      timeout: 60000,
    });
    // ENOENT = command not found on Unix
    if (result.error && (result.error as any).code === "ENOENT") continue;
    // 9009 = "command not recognized" on Windows
    if (result.status === 9009) continue;
    return result;
  }
  // All commands exhausted — return last result so the caller can log the error
  return spawnSync(PYTHON_COMMANDS[PYTHON_COMMANDS.length - 1], args, {
    cwd: ALGO_DIR,
    encoding: "utf-8",
    timeout: 60000,
  });
}

async function runAlgo(
  courseCode: string,
  aosCode: string,
  standardYears?: number,
  minorMajorType?: string,
  minorMajorCode?: string,
): Promise<Schedule | null> {
  const outputFile = `schedule_${crypto.randomUUID()}.json`;

  const args = [
    "algo1.py",
    "--course",
    courseCode,
    "--specialisation",
    aosCode,
    "--campus",
    "Clayton",
    "--output",
    outputFile,
  ];

  if (minorMajorType === "major" && minorMajorCode) {
    args.push("--major", minorMajorCode);
  } else if (minorMajorType === "minor" && minorMajorCode) {
    args.push("--minor", minorMajorCode);
  }

  if (standardYears && Number.isFinite(standardYears)) {
    args.push("--years", String(standardYears));
  }

  const result = spawnPython(args);

  if (result.status !== 0) {
    // console.error("algo1.py stderr:", result.stderr);
    // console.error("algo1.py stdout:", result.stdout);
    return null;
  }

  const outputPath = path.join(ALGO_DIR, outputFile);
  try {
    const raw = readFileSync(outputPath, "utf-8");
    unlinkSync(outputPath);
    return JSON.parse(raw) as Schedule;
  } catch (e) {
    // console.error("Failed to read schedule output:", e);
    return null;
  }
}

// ── Interest → search keywords ────────────────────────────────────────────────

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

// ── Prerequisite checker ──────────────────────────────────────────────────────
// Mirrors the algo's parsing: '&' = AND between groups, ';' = OR within a group.

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
    // Split AND-groups first, then check each as an OR-group
    const andGroups = rule.split("&").map((g) => g.replace(/[()]/g, "").trim());
    for (const orGroup of andGroups) {
      if (!orGroup) continue;
      const alternatives = orGroup
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean);
      if (alternatives.length && !alternatives.some((c) => completed.has(c)))
        return false;
    }
  }
  return true;
}

// ── Interest-based elective recommender ──────────────────────────────────────

async function recommendElectives(
  interests: string[],
  schedule: Schedule,
  planUnitCodes: Set<string>,
  maxSemesters: number,
): Promise<{ schedule: Schedule; electiveCodes: Set<string> }> {
  if (interests.length === 0) return { schedule, electiveCodes: new Set() };

  try {
    // Load raw units for prerequisite checking
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

    // Highest relevance first, ties broken by level ascending
    const candidates = Array.from(candidateMap.values()).sort(
      (a, b) => b._score - a._score || (a.level ?? 1) - (b.level ?? 1),
    );

    const updatedSemesters = schedule.schedule.map((s) => ({
      ...s,
      units: [...s.units],
    }));
    const usedCodes = new Set<string>();
    const electiveCodes = new Set<string>();
    const completedSoFar = new Set<string>(); // units completed before the current semester

    for (let semIdx = 0; semIdx < updatedSemesters.length; semIdx++) {
      const sem = updatedSemesters[semIdx];
      if (!sem.period) continue; // skip unscheduled bucket
      if (sem.semester_index > maxSemesters) continue; // semester_index is 1-based; skip overflow

      // sem_index 0-1 → Year 1 (L1 only), 2-3 → Year 2 (≤L2), 4+ → Year 3+ (≤L3)
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

      // Mark all units in this semester as completed for the next semester's checks
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

// ── Overflow collapse ─────────────────────────────────────────────────────────
// If the algo places units beyond the student's planned years, move them into
// the last planned semester (replacing ELECTIVE slots first, then appending).

function collapseOverflow(schedule: Schedule, maxSemesters: number): Schedule {
  const sems = schedule.schedule.map((s) => ({ ...s, units: [...s.units] }));

  // semester_index is 1-based (algo outputs idx+1), so overflow starts at > maxSemesters
  const overflowSems = sems.filter(
    (s) => s.period !== null && s.semester_index > maxSemesters,
  );
  if (overflowSems.length === 0) return schedule;

  const overflowUnits = overflowSems.flatMap((s) =>
    s.units.filter((u) => u.code !== "ELECTIVE"),
  );

  if (overflowUnits.length > 0) {
    // Work backwards through planned semesters — place into the latest one that fits
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
      // No ELECTIVE slot anywhere — append to the last planned semester
      if (!placed && plannedSems.length > 0) {
        plannedSems[0].units.push(unit);
      }
    }
  }

  // Drop overflow semesters; keep planned semesters and the unscheduled bucket
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
    // Core units: the req_2 group in the course definition
    const coursesRaw = JSON.parse(readFileSync(COURSES_PATH, "utf-8"));
    const courseEntry = coursesRaw[courseCode];
    const req2 = (courseEntry?.requirement_groups ?? []).find(
      (g: any) => g.id === "req_2",
    );
    if (req2?.units?.length) {
      coreUnits = new Set<string>(req2.units);
    }

    // Specialisation units: all_units of the selected AOS
    const aosRaw = JSON.parse(readFileSync(AOS_PATH, "utf-8"));
    const aosEntry = aosRaw[aosCode];
    if (aosEntry?.all_units) {
      aosUnits = new Set(Object.keys(aosEntry.all_units));
    }

    // Minor / Major units
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
        // Interest-based elective placed by recommendElectives
        category = "Elective";
      } else if (minorMajorUnits.has(unit.code)) {
        // Minor / Major takes priority over core/specialisation
        category = minorMajorType === "minor" ? "Minor" : "Major";
      } else if (coreUnits.has(unit.code)) {
        // Explicitly listed as core in the course's req_2
        category = "Core";
      } else if (aosUnits.has(unit.code)) {
        // In the AOS but not in core → Specialisation
        category = "Specialisation";
      }
      // Anything else (e.g. prerequisite units pulled in by the algo) stays "Core"
      return { ...unit, category };
    }),
  }));

  return { ...schedule, schedule: enriched };
}

function getDurationYears(yearStart: number, yearEnd: number) {
  if (!Number.isFinite(yearStart) || !Number.isFinite(yearEnd))
    return undefined;
  if (yearEnd <= yearStart) return undefined;
  return Math.min(7, Math.max(2, yearEnd - yearStart));
}

export default async function NewPlanPage() {
  const user = await currentUser();

  if (!user) redirect("/sign-in");
  if (isAdminUser(user)) redirect("/admin");

  async function handleSubmit(formData: FormData) {
    "use server";

    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) redirect("/sign-in");

    const planId = crypto.randomUUID();
    const courseCode = String(formData.get("courseCode") || "");
    const rawAosCode = String(formData.get("areaOfStudy") || "");
    const aosCode = rawAosCode === NO_AREA_OF_STUDY_VALUE ? "" : rawAosCode;
    const minorMajorType = String(formData.get("minorMajorType") || "");
    const minorMajorCode = String(formData.get("minorMajorCode") || "");
    const interests = formData
      .getAll("interests")
      .map((value) => String(value))
      .filter(Boolean)
      .slice(0, 3);
    const yearStart = Number(formData.get("yearStart"));
    const yearEnd = Number(formData.get("yearEnd"));
    const durationYears = getDurationYears(yearStart, yearEnd);

    const newPlan: Plan = {
      id: planId,
      planName: String(formData.get("planName") || ""),
      courseCode: courseCode,
      university: String(formData.get("university") || ""),
      areaOfStudy: aosCode,
      interests,
      semesterOffering: String(formData.get("semesterOffering") || ""),
      yearStart,
      yearEnd,
    };

    console.log("Course end submitted:", newPlan.yearEnd);
    console.log("Course duration years:", durationYears);

    let rawSchedule = await runAlgo(
      courseCode,
      aosCode,
      durationYears,
      minorMajorType || undefined,
      minorMajorCode || undefined,
    );

    const maxSemesters =
      (Number(formData.get("yearEnd")) -
        Number(formData.get("yearStart")) +
        1) *
      2;

    // Move any overflow units (beyond the student's planned years) into the last planned semester
    if (rawSchedule) {
      rawSchedule = collapseOverflow(rawSchedule, maxSemesters);
    }

    let electiveCodes = new Set<string>();
    if (rawSchedule && interests.length > 0) {
      const planCodes = new Set<string>(
        rawSchedule.schedule
          .flatMap((s) => s.units.map((u) => u.code))
          .filter((c) => c !== "ELECTIVE"),
      );
      const result = await recommendElectives(
        interests,
        rawSchedule,
        planCodes,
        maxSemesters,
      );
      rawSchedule = result.schedule;
      electiveCodes = result.electiveCodes;
    }

    if (rawSchedule) {
      newPlan.schedule = enrichCategories(
        rawSchedule,
        courseCode,
        aosCode,
        minorMajorType || undefined,
        minorMajorCode || undefined,
        electiveCodes,
      );
    }

    // console.log("raw sched", rawSchedule, newPlan.schedule);

    // Not directly save to the database

    // const profile = await getProfileByEmail(email);
    // const existingPlans: Plan[] = profile?.plans ?? [];
    // await updateProfile(email, { plans: [...existingPlans, newPlan] });

    await savePendingPlan(email, newPlan);
    redirect(`/course-plan/${planId}?pending=true`);
  }

  return (
    <main className="min-h-screen bg-[#f5f5f4] text-black">
      <header className="border-b border-black/10 bg-[#f5f5f4]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="relative h-8 w-8 overflow-hidden rounded-lg"
            >
              <Image
                src="/U-NIT ME-3.png"
                alt="U-NIT ME logo"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </Link>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tracking-tight">
                U-NIT ME
              </span>
              <span className="hidden text-sm text-black/30 sm:inline">
                Create New Plan
              </span>
            </div>
          </div>

          <UserButton />
        </div>
      </header>

      <section className="px-6 py-12 md:px-8 md:py-14">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm text-black/45 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl font-semibold tracking-tight text-black">
              Your Details
            </h1>
            <p className="mt-2 text-base text-black/45">
              Fill in your information below and we&apos;ll generate a
              personalized course plan.
            </p>
          </div>

          <StudentDetailsForm action={handleSubmit} />
        </div>
      </section>
    </main>
  );
}
