"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import CoursePlanner from "../../components/CoursePlanner";
import UnitDetailPanel from "../../components/UnitDetailPanel";

export default function CoursePlanPage() {
  const router = useRouter();
  const [studentDetails, setStudentDetails] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  useEffect(() => {
    const storedDetails = localStorage.getItem("studentDetails");

    if (!storedDetails) {
      router.replace("/dashboard/new");
      return;
    }

    try {
      setStudentDetails(JSON.parse(storedDetails));
    } catch {
      localStorage.removeItem("studentDetails");
      router.replace("/dashboard/new");
    }
  }, [router]);

  useEffect(() => {
    if (!studentDetails) {
      return;
    }

    const start = Number(studentDetails.yearStart);
    const end = Number(studentDetails.yearEnd);
    const yearSpan =
      Number.isFinite(start) && Number.isFinite(end) && end >= start
        ? end - start + 1
        : 0;
    const unitCount = yearSpan * 8;
    const totalCredits = unitCount * 6;
    const currentPlanId = localStorage.getItem("currentPlanId");

    let savedPlans = [];

    try {
      savedPlans = JSON.parse(localStorage.getItem("savedPlans") || "[]");
      if (!Array.isArray(savedPlans)) {
        savedPlans = [];
      }
    } catch {
      savedPlans = [];
    }

    const nextPlan = {
      id: currentPlanId || crypto.randomUUID(),
      studentDetails,
      savedAt: new Date().toISOString(),
      unitCount,
      totalCredits,
    };

    const existingIndex = savedPlans.findIndex((plan) => plan.id === nextPlan.id);

    if (existingIndex >= 0) {
      savedPlans[existingIndex] = nextPlan;
    } else {
      savedPlans.unshift(nextPlan);
    }

    localStorage.setItem("savedPlans", JSON.stringify(savedPlans));
    localStorage.setItem("currentPlanId", nextPlan.id);
  }, [studentDetails]);

  if (!studentDetails) {
    return null;
  }

  const infoPills = [
    studentDetails.planName,
    studentDetails.degree,
    studentDetails.major,
    studentDetails.minor && `Minor: ${studentDetails.minor}`,
    studentDetails.specialisation && `Spec: ${studentDetails.specialisation}`,
    studentDetails.faculty,
    studentDetails.semesterOffering,
    studentDetails.university,
  ].filter(Boolean);

  const handleRegenerate = () => {
    localStorage.removeItem("currentPlanId");
    router.push("/dashboard/new");
  };

  const handleExport = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-[#f5f5f2] text-black">
      <header className="border-b border-black/10 bg-[#f5f5f2]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-semibold text-white">
                U
              </div>
              <span className="text-sm font-medium tracking-tight">U-NIT ME</span>
            </div>
          </div>

          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <section className="bg-black px-6 py-10 text-white md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-white/50" />
                <span className="text-xs text-white/50">AI Generated</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Your Course Plan
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {infoPills.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs text-white/60"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-white/50 transition-all hover:border-white/30 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs text-black transition-all hover:bg-white/90"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 md:px-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-black/40 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <CoursePlanner
            studentDetails={studentDetails}
            showHeader={false}
            onUnitClick={(unit) => setSelectedUnit(unit)}
          />
        </div>
      </section>

      <footer className="border-t border-black/10 px-6 py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-xs text-black/25">
            Generated by U-NIT ME — always verify with your university&apos;s
            official handbook
          </p>
          <p className="text-xs text-black/20">
            {studentDetails.semesterOffering} • {studentDetails.yearStart}–
            {studentDetails.yearEnd}
          </p>
        </div>
      </footer>

      <UnitDetailPanel
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
      />
    </main>
  );
}
