"use client";

import { useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none transition-all focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/[0.03]";

const disabledInputClass =
  "disabled:cursor-not-allowed disabled:border-black/6 disabled:bg-black/[0.02] disabled:text-black/25 disabled:placeholder:text-black/18";

const degreeOptionsByFaculty = {
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

export default function StudentDetailsForm({ onSubmit }) {
  const [faculty, setFaculty] = useState("IT");
  const [degree, setDegree] = useState("COMPSCI");

  const availableDegrees = degreeOptionsByFaculty[faculty] || [];

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const selectedDegree = String(formData.get("degree") || "");

    const data = {
      university: String(formData.get("university") || ""),
      faculty: String(formData.get("faculty") || ""),
      degree: selectedDegree,
      specialisation:
        selectedDegree === "COMPSCI"
          ? String(formData.get("specialisation") || "")
          : null,
      major:
        selectedDegree === "IT"
          ? String(formData.get("major") || "")
          : null,
      minor:
        selectedDegree === "IT"
          ? String(formData.get("minor") || "")
          : null,
      yearStart: Number(formData.get("yearStart")),
      yearEnd: Number(formData.get("yearEnd")),
    };

    console.log("form submit data:", data);
    onSubmit?.(data);
  };

  return (
    <div className="rounded-3xl border border-black/10 bg-white px-7 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] md:px-8 md:py-9">
      <form onSubmit={handleSubmit} className="space-y-7">
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
                  className={`${inputClass} appearance-none pr-10`}
                  defaultValue="Monash University"
                >
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

                    const degreeStillValid = degreeOptionsByFaculty[
                      nextFaculty
                    ]?.some((option) => option.value === degree);

                    if (!degreeStillValid) {
                      const firstDegree =
                        degreeOptionsByFaculty[nextFaculty]?.[0]?.value || "";
                      setDegree(firstDegree);
                    }
                  }}
                  className={`${inputClass} appearance-none pr-10`}
                >
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
                  {availableDegrees.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
                defaultValue="Software Development"
                required={degree === "COMPSCI"}
                disabled={!degree || degree === "IT"}
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
                defaultValue="Computer Science"
                required={degree === "IT"}
                disabled={!degree || degree === "COMPSCI"}
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
                defaultValue="Mathematics"
                disabled={!degree || degree === "COMPSCI"}
                className={`${inputClass} ${disabledInputClass}`}
              />
            </div>
          </div>
        </section>

        <section>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-black/28">
            Timeline
          </p>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label
                htmlFor="yearStart"
                className="mb-2 block text-sm font-medium text-black/75"
              >
                Year Start <span className="text-black/30">*</span>
              </label>
              <input
                id="yearStart"
                name="yearStart"
                type="number"
                placeholder="2024"
                min="2020"
                max="2035"
                required
                defaultValue="2024"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="yearEnd"
                className="mb-2 block text-sm font-medium text-black/75"
              >
                Year End <span className="text-black/30">*</span>
              </label>
              <input
                id="yearEnd"
                name="yearEnd"
                type="number"
                placeholder="2027"
                min="2020"
                max="2040"
                required
                defaultValue="2027"
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
      </form>
    </div>
  );
}