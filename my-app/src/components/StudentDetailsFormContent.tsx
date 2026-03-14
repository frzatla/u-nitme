import { ChevronDown, Sparkles } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none transition-all focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/[0.03]";

export default function StudentDetailsFormContent() {
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
              htmlFor="course"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Courses <span className="text-black/30">*</span>
            </label>
            <input
              id="course"
              name="course"
              required
              placeholder="e.g., Bachelor of Computer Science"
              className={inputClass}
            />
          </div>

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
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="degree"
              className="mb-2 block text-sm font-medium text-black/75"
            >
              Area of Study <span className="text-black/30">*</span>
            </label>
            <input
              id="degree"
              name="degree"
              required
              placeholder="e.g., Software Development, Computer Science, Design"
              className={inputClass}
            />
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
