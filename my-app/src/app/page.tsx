"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  MoveRight,
  Search,
  Sparkles,
} from "lucide-react";
import { Instrument_Serif } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
});

const proofPoints = [
  { value: "AI", label: "degree mapping" },
  { value: "Drag", label: "semester editing" },
  { value: "Live", label: "unit discovery" },
];

const previewPlans = {
  cs: {
    label: "Computer Science",
    title: "Computer Science Plan",
    semesters: [
      {
        title: "Semester 1",
        tone: "bg-[#f3f3f1] text-[#131313]",
        units: ["FIT1045", "MAT1830", "FIT1051", "ENG1005"],
      },
      {
        title: "Semester 2",
        tone: "bg-[#e6e6e2] text-[#131313]",
        units: ["FIT1047", "FIT1008", "MAT1841", "ELECTIVE"],
      },
      {
        title: "Semester 3",
        tone: "bg-[#dbdbd6] text-[#131313]",
        units: ["FIT2004", "FIT2099", "FIT2102", "ELECTIVE"],
      },
    ],
  },
  engineering: {
    label: "Engineering",
    title: "Engineering Plan",
    semesters: [
      {
        title: "Semester 1",
        tone: "bg-[#f3f3f1] text-[#131313]",
        units: ["ENG1011", "ENG1005", "PHS1001", "MTH1020"],
      },
      {
        title: "Semester 2",
        tone: "bg-[#e6e6e2] text-[#131313]",
        units: ["ENG1014", "ENG1021", "MTH1030", "CHM1011"],
      },
      {
        title: "Semester 3",
        tone: "bg-[#dbdbd6] text-[#131313]",
        units: ["ENG2005", "ECE2071", "MEC2401", "ELECTIVE"],
      },
    ],
  },
  arts: {
    label: "Arts",
    title: "Arts Degree Plan",
    semesters: [
      {
        title: "Semester 1",
        tone: "bg-[#f3f3f1] text-[#131313]",
        units: ["ATS1050", "ATS1261", "ATS1371", "ELECTIVE"],
      },
      {
        title: "Semester 2",
        tone: "bg-[#e6e6e2] text-[#131313]",
        units: ["ATS2219", "ATS2084", "ATS2264", "ELECTIVE"],
      },
      {
        title: "Semester 3",
        tone: "bg-[#dbdbd6] text-[#131313]",
        units: ["ATS3292", "ATS2946", "ATS2910", "ELECTIVE"],
      },
    ],
  },
} as const;

export default function Home() {
  const [selectedPlan, setSelectedPlan] =
    useState<keyof typeof previewPlans>("cs");
  const activePlan = previewPlans[selectedPlan];
  const landingBoundsRef = useRef<HTMLElement | null>(null);

  return (
    <main
      ref={landingBoundsRef}
      className="relative min-h-screen overflow-hidden bg-[#090909] text-[#f3f1eb]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(255,255,255,0.14),transparent_24%),radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
        <div className="absolute left-1/2 top-0 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-white/8 blur-3xl" />
      </div>

      <header className="relative z-20">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/12 bg-white/6 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
              <Image
                src="/U-NIT ME-2.png"
                alt="U-NIT ME logo"
                fill
                sizes="44px"
                className="object-contain"
                priority
              />
            </span>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-[#f3f1eb]/58">
                U-NIT ME
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#f3f1eb]/32">
                Monash Planner
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/about"
              className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#f3f1eb]/72 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-[#f3f1eb]"
            >
              About
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-[#f3f1eb]/72 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-[#f3f1eb]"
            >
              Sign In
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl items-center px-6 pb-8 pt-4 md:px-10 md:pb-10">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/[0.05] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-white/72"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Built for students who are done decoding handbooks
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.95, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 text-[clamp(4.2rem,10vw,8.8rem)] font-semibold leading-[0.84] tracking-[-0.095em] text-[#f3f1eb]"
            >
              Stop planning
              <br />
              <span className={`${instrumentSerif.className} font-normal italic text-white/72`}>
                around chaos.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 max-w-xl text-base leading-8 text-[#f3f1eb]/66 md:text-lg"
            >
              U-NIT ME turns degree requirements, prerequisite chains, and
              elective choices into a plan that finally feels readable.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-[#f3f1eb]/72 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-[#f3f1eb]"
              >
                Start Planning
                <MoveRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3.5 text-sm text-[#f3f1eb]/72 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-[#f3f1eb]"
              >
                Explore the Product
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 flex flex-wrap gap-3"
            >
              {proofPoints.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-sm"
                >
                  <div className="text-lg font-semibold tracking-[-0.05em] text-[#f3f1eb]">
                    {item.value}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#f3f1eb]/42">
                    {item.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[34rem]"
          >
            <motion.div
              drag
              dragConstraints={landingBoundsRef}
              dragElastic={0.08}
              dragMomentum={false}
              whileDrag={{ scale: 1.03, rotate: -2, cursor: "grabbing" }}
              animate={{ y: [0, -10, 0], rotate: [0, 1.2, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 top-10 z-20 cursor-grab rounded-[26px] border border-white/12 bg-[#141414]/88 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-md"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#f3f1eb]/52">
                <Search className="h-3.5 w-3.5" />
                Free Elective
              </div>
              <div className="mt-3 text-sm font-medium text-[#f3f1eb]">
                Find units by skill, topic, or code.
              </div>
            </motion.div>

            <motion.div
              drag
              dragConstraints={landingBoundsRef}
              dragElastic={0.08}
              dragMomentum={false}
              whileDrag={{ scale: 1.03, rotate: 2, cursor: "grabbing" }}
              animate={{ y: [0, 10, 0], x: [0, -4, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute -left-5 bottom-14 z-20 cursor-grab rounded-[26px] border border-white/12 bg-[#171717]/88 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-md"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/56">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Smart Sequencing
              </div>
              <div className="mt-3 text-sm font-medium text-[#f3f1eb]">
                Prereqs placed before they become a problem.
              </div>
            </motion.div>

            <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-md">
              <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_72%)]" />

              <div className="relative flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#f3f1eb]/42">
                    Live Preview
                  </div>
                  <div className="mt-1 text-xl font-semibold tracking-[-0.05em] text-[#f3f1eb]">
                    {activePlan.title}
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#f3f1eb]/56">
                  <CalendarRange className="h-3.5 w-3.5" />
                  2026 Intake
                </div>
              </div>

              <div className="relative mt-4 flex flex-wrap gap-2">
                {(
                  Object.entries(previewPlans) as [
                    keyof typeof previewPlans,
                    (typeof previewPlans)[keyof typeof previewPlans],
                  ][]
                ).map(([key, plan]) => {
                  const isActive = key === selectedPlan;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPlan(key)}
                      className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${
                        isActive
                          ? "border-white/30 bg-white text-black"
                          : "border-white/10 bg-white/[0.03] text-[#f3f1eb]/56 hover:border-white/20 hover:text-[#f3f1eb]"
                      }`}
                    >
                      {plan.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative mt-5 space-y-3">
                {activePlan.semesters.map((card, index) => (
                  <motion.div
                    key={`${selectedPlan}-${card.title}`}
                    initial={{ opacity: 0, x: 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.7,
                      delay: 0.3 + index * 0.12,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`rounded-[28px] p-4 ${card.tone}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] uppercase tracking-[0.2em] opacity-55">
                        {card.title}
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.18em] opacity-55">
                        24 CP
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {card.units.map((unit) => (
                        <div
                          key={unit}
                          className="rounded-2xl border border-black/8 bg-black/[0.05] px-3 py-3 text-sm font-medium tracking-[-0.03em]"
                        >
                          {unit}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
