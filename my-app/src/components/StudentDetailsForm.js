"use client";

import { Sparkles, ChevronDown } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none transition-all focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/[0.03]";

export default function StudentDetailsForm({ onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const data = {
      university: formData.get("university"),
      faculty: formData.get("faculty"),
      specialisation: formData.get("specialisation"),
      major: formData.get("major"),
      minor: formData.get("minor"),
      yearStart: formData.get("yearStart"),
      yearEnd: formData.get("yearEnd"),
    };

    onSubmit?.(data);
  };

  return (
    <div className="rounded-3xl border border-black/10 bg-white px-7 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] md:px-8 md:py-9">
      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Institution */}
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
                  className={`${inputClass} appearance-none pr-10`}
                  defaultValue=""
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

        {/* Course Details */}
        <section>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-black/28">
            Course Details
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="specialisation"
                className="mb-2 block text-sm font-medium text-black/75"
              >
                Specialisation <span className="text-black/30">*</span>
              </label>
              <input
                id="specialisation"
                name="specialisation"
                placeholder="e.g., Software Development"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="major"
                className="mb-2 block text-sm font-medium text-black/75"
              >
                Major
              </label>
              <input
                id="major"
                name="major"
                placeholder="e.g., Computer Science"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="minor"
                className="mb-2 block text-sm font-medium text-black/75"
              >
                Minor <span className="text-black/25">(optional)</span>
              </label>
              <input
                id="minor"
                name="minor"
                placeholder="e.g., Mathematics"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Timeline */}
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
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Submit */}
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
