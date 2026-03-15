"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

type CourseOption = { code: string; title: string };
type AosOption = { code: string; title: string };

const inputClass =
  "w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none transition-all focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/[0.03]";

export default function StudentDetailsFormContent({
  courseCode,
  aosList,
  minorAosList,
  majorAosList,
  courseToAos,
}: {
  courseCode: CourseOption[];
  aosList: AosOption[];
  minorAosList: AosOption[];
  majorAosList: AosOption[];
  courseToAos: Record<string, string[]>;
}) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [minorMajorType, setMinorMajorType] = useState("");

  const filteredAos =
    selectedCourse && courseToAos[selectedCourse]
      ? aosList.filter((a) => courseToAos[selectedCourse].includes(a.code))
      : [];

  return (
    <>
      <section>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="planName"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Plan Name <span className="text-black/30">*</span>
            </label>
            <input
              id="planName"
              name="planName"
              required
              placeholder="e.g., My 2026 Course Plan"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="university"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              University <span className="text-black/30">*</span>
            </label>
            <div className="relative">
              <select
                id="university"
                name="university"
                required
                defaultValue=""
                className={`${inputClass} appearance-none pr-10`}
              >
                <option value="" disabled>
                  Select university
                </option>
                <option value="Monash University">Monash University</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            </div>
          </div>

          <div>
            <label
              htmlFor="courseCode"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              courseCode <span className="text-black/30">*</span>
            </label>
            <div className="relative">
              <select
                id="courseCode"
                name="courseCode"
                required
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className={`${inputClass} appearance-none pr-10`}
              >
                <option value="" disabled>
                  Select course
                </option>
                {courseCode.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}: {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="areaOfStudy"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Area of Study <span className="text-black/30">*</span>
            </label>
            <div className="relative">
              <select
                id="areaOfStudy"
                name="areaOfStudy"
                required
                defaultValue=""
                disabled={!selectedCourse}
                className={`${inputClass} appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <option value="" disabled>
                  {selectedCourse
                    ? "Select area of study"
                    : "Select a course first"}
                </option>
                {filteredAos.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="minorMajorType"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Minor / Major <span className="text-black/30">Optional</span>
            </label>
            <div className="relative">
              <select
                id="minorMajorType"
                name="minorMajorType"
                value={minorMajorType}
                onChange={(e) => setMinorMajorType(e.target.value)}
                className={`${inputClass} appearance-none pr-10`}
              >
                <option value="">None</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            </div>
          </div>

          <div>
            <label
              htmlFor="minorMajorCode"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Select{" "}
              {minorMajorType === "major"
                ? "Major"
                : minorMajorType === "minor"
                  ? "Minor"
                  : "Minor/Major"}
            </label>
            <div className="relative">
              <select
                id="minorMajorCode"
                name="minorMajorCode"
                defaultValue=""
                disabled={!minorMajorType}
                className={`${inputClass} appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <option value="">
                  {minorMajorType
                    ? `Select ${minorMajorType}`
                    : "Select type first"}
                </option>
                {(minorMajorType === "minor"
                  ? minorAosList
                  : minorMajorType === "major"
                    ? majorAosList
                    : aosList
                ).map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code}: {a.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="semesterOffering"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Unit Offerings
            </label>
            <div className="relative">
              <select
                id="semesterOffering"
                name="semesterOffering"
                required
                defaultValue=""
                className={`${inputClass} appearance-none pr-10`}
              >
                <option value="" disabled>
                  Select offering
                </option>
                <option value="February">February</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            </div>
          </div>

          <div>
            <label
              htmlFor="yearStart"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Course Start <span className="text-black/30">*</span>
            </label>
            <input
              id="yearStart"
              name="yearStart"
              type="number"
              placeholder="2024"
              min="2020"
              max="2035"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="yearEnd"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Course End <span className="text-black/30">*</span>
            </label>
            <input
              id="yearEnd"
              name="yearEnd"
              type="number"
              placeholder="2027"
              min="2020"
              max="2040"
              required
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <div className="pt-1">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-black/90"
        >
          <Sparkles className="h-4 w-4" />
          Generate AI Course Plan
        </button>
      </div>
    </>
  );
}
