"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none transition-all focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/[0.03]";

const disabledInputClass =
  "disabled:cursor-not-allowed disabled:border-black/6 disabled:bg-black/[0.02] disabled:text-black/25 disabled:placeholder:text-black/18";

const degreeOptionsByFaculty: Record<
  string,
  { value: string; label: string }[]
> = {
  IT: [
    { value: "COMPSCI", label: "COMPSCI" },
    { value: "IT", label: "IT" },
  ],
  Arts: [
    { value: "International Relations", label: "International Relations" },
    { value: "Design", label: "Design" },
    { value: "Linguistics", label: "Linguistics" },
  ],
};

export default function StudentDetailsFormContent() {
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [degree, setDegree] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [major, setMajor] = useState("");
  const [minor, setMinor] = useState("");
  const [semesterOffering, setSemesterOffering] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");

  const availableDegrees = degreeOptionsByFaculty[faculty] || [];

  return (
    <>
      <section>
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-black/28">
          Institution
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="university"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              University
            </label>
            <div className="relative">
              <select
                id="university"
                name="university"
                required
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
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
              htmlFor="faculty"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Faculty
            </label>
            <div className="relative">
              <select
                id="faculty"
                name="faculty"
                required
                value={faculty}
                onChange={(e) => {
                  const nextFaculty = e.target.value;
                  setFaculty(nextFaculty);
                  const valid = degreeOptionsByFaculty[nextFaculty]?.some(
                    (o) => o.value === degree,
                  );
                  if (!valid) setDegree("");
                }}
                className={`${inputClass} appearance-none pr-10`}
              >
                <option value="" disabled>
                  Select faculty
                </option>
                <option value="IT">IT</option>
                <option value="Arts">Arts</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-black/28">
          Course Details
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="degree"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Degree <span className="text-black/30">*</span>
            </label>
            <div className="relative">
              <select
                id="degree"
                name="degree"
                required
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                disabled={!faculty}
                className={`${inputClass} ${disabledInputClass} appearance-none pr-10`}
              >
                <option value="" disabled>
                  Select degree
                </option>
                {availableDegrees.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            </div>
          </div>

          <div>
            <label
              htmlFor="specialisation"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Specialisation{" "}
              {degree === "COMPSCI" ? (
                <span className="text-black/30">*</span>
              ) : (
                <span className="text-black/25">(COMPSCI only)</span>
              )}
            </label>
            <input
              id="specialisation"
              name="specialisation"
              placeholder="e.g., Software Development"
              value={specialisation}
              onChange={(e) => setSpecialisation(e.target.value)}
              required={degree === "COMPSCI"}
              disabled={!degree || degree !== "COMPSCI"}
              className={`${inputClass} ${disabledInputClass}`}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="major"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Major{" "}
              {degree === "IT" ? (
                <span className="text-black/30">*</span>
              ) : (
                <span className="text-black/25">(IT only)</span>
              )}
            </label>
            <input
              id="major"
              name="major"
              placeholder="e.g., Computer Science"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              required={degree === "IT"}
              disabled={!degree || degree !== "IT"}
              className={`${inputClass} ${disabledInputClass}`}
            />
          </div>

          <div>
            <label
              htmlFor="minor"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Minor <span className="text-black/25">(IT optional)</span>
            </label>
            <input
              id="minor"
              name="minor"
              placeholder="e.g., Mathematics"
              value={minor}
              onChange={(e) => setMinor(e.target.value)}
              disabled={!degree || degree !== "IT"}
              className={`${inputClass} ${disabledInputClass}`}
            />
          </div>
        </div>
      </section>

      <section>
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-black/28">
          Timeline
        </p>

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
                value={semesterOffering}
                onChange={(e) => setSemesterOffering(e.target.value)}
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
              value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
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
              value={yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
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
