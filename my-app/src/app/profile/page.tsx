import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import StudentDetailsForm from "../../components/StudentDetailsForm";
import { redirect } from "next/navigation";
import { getProfileByEmail, updateProfile } from "@/lib/profile";
import { Plan, Profile, Schedule, UnitCategory } from "@/lib/types";
import { spawnSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import path from "path";

const ALGO_DIR = path.join(process.cwd(), "src/algo");
const AOS_PATH = path.join(process.cwd(), "public/data/final_aos.json");

function runAlgo(
  courseCode: string,
  aosCode: string,
  outputFile: string,
): Schedule | null {
  const result = spawnSync(
    "python3",
    [
      "algo1.py",
      "--course",
      courseCode,
      "--specialisation",
      aosCode,
      "--campus",
      "Clayton",
      "--output",
      outputFile,
    ],
    { cwd: ALGO_DIR, encoding: "utf-8", timeout: 60000 },
  );

  if (result.status !== 0) {
    console.error("algo1.py stderr:", result.stderr);
    return null;
  }

  const outputPath = path.join(ALGO_DIR, outputFile);
  try {
    const raw: Schedule = JSON.parse(readFileSync(outputPath, "utf-8"));
    unlinkSync(outputPath);
    return raw;
  } catch (e) {
    console.error("Failed to read schedule output:", e);
    return null;
  }
}

function enrichCategories(schedule: Schedule, aosCode: string): Schedule {
  let aosUnits = new Set<string>();
  try {
    const aosRaw = JSON.parse(readFileSync(AOS_PATH, "utf-8"));
    const entry = aosRaw[aosCode];
    if (entry?.all_units) {
      aosUnits = new Set(Object.keys(entry.all_units));
    }
  } catch (_) {}

  const enriched = schedule.schedule.map((sem) => ({
    ...sem,
    units: sem.units.map((unit) => {
      let category: UnitCategory = "Core";
      if (unit.code === "ELECTIVE") {
        category = "Elective";
      } else if (aosUnits.has(unit.code)) {
        category = "Specialisation";
      }
      return { ...unit, category };
    }),
  }));

  return { ...schedule, schedule: enriched };
}

export default async function NewPlanPage() {
  const user = await currentUser();

  async function handleSubmit(formData: FormData) {
    "use server";

    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) redirect("/sign-in");

    const planId = crypto.randomUUID();
    const courseCode = String(formData.get("courses") || "");
    const aosCode = String(formData.get("areaOfStudy") || "");

    const newPlan: Plan = {
      id: planId,
      planName: String(formData.get("planName") || ""),
      courses: courseCode,
      university: String(formData.get("university") || ""),
      areaOfStudy: aosCode,
      semesterOffering: String(formData.get("semesterOffering") || ""),
      yearStart: Number(formData.get("yearStart")),
      yearEnd: Number(formData.get("yearEnd")),
      saved: false,
    };

    const outputFile = `schedule_${planId}.json`;
    const rawSchedule = runAlgo(courseCode, aosCode, outputFile);
    if (rawSchedule) {
      newPlan.schedule = enrichCategories(rawSchedule, aosCode);
    }

    const profile = await getProfileByEmail(email);
    const existingPlans: Plan[] = profile?.plans ?? [];
    await updateProfile(email, { plans: [...existingPlans, newPlan] });

    redirect(`/course-plan/${planId}`);
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
