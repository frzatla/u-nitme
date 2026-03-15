"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Search, Sparkles } from "lucide-react";

type CourseOption = { code: string; title: string };
type AosOption = { code: string; title: string };

const NO_AREA_OF_STUDY_VALUE = "__NO_AREA_OF_STUDY__";

const inputClass =
  "w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none transition-all focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/[0.03]";

function SearchableSelect({
  id,
  name,
  label,
  placeholder,
  emptyLabel,
  options,
  value,
  disabled = false,
  required = false,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  emptyLabel: string;
  options: { code: string; title: string }[];
  value: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = options.find((option) => option.code === value);
  const visibleOptions = options.filter((option) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;

    return (
      option.code.toLowerCase().includes(search) ||
      option.title.toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-black/75"
      >
        {label} {required && <span className="text-black/30">*</span>}
      </label>

      <div className="relative">
        <input type="hidden" id={id} name={name} value={value} />

        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className={`${inputClass} flex items-center justify-between pr-10 text-left disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span className={selectedOption ? "text-black" : "text-black/30"}>
            {selectedOption
              ? `${selectedOption.code}: ${selectedOption.title}`
              : placeholder}
          </span>
        </button>

        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />

        {open && !disabled && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}`}
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {visibleOptions.length > 0 ? (
                visibleOptions.map((option) => {
                  const isSelected = option.code === value;

                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => {
                        onChange(option.code);
                        setOpen(false);
                      }}
                      className="flex w-full items-start justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-black/[0.04]"
                    >
                      <div>
                        <div className="text-sm font-medium text-black">
                          {option.code}
                        </div>
                        <div className="mt-1 text-sm text-black/45">
                          {option.title}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="mt-0.5 h-4 w-4 text-black/50" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl px-4 py-3 text-sm text-black/40">
                  {emptyLabel}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [selectedAos, setSelectedAos] = useState("");
  const [minorMajorType, setMinorMajorType] = useState("");
  const [selectedMinorMajorCode, setSelectedMinorMajorCode] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");

  const filteredAos =
    selectedCourse && courseToAos[selectedCourse]
      ? aosList.filter((a) => courseToAos[selectedCourse].includes(a.code))
      : [];
  const areaOfStudyOptions =
    selectedCourse && filteredAos.length === 0
      ? [
          {
            code: NO_AREA_OF_STUDY_VALUE,
            title: "No area of study",
          },
        ]
      : filteredAos;
  const minorMajorOptions =
    minorMajorType === "minor"
      ? minorAosList
      : minorMajorType === "major"
        ? majorAosList
        : [];

  useEffect(() => {
    setSelectedAos("");
  }, [selectedCourse]);

  useEffect(() => {
    setSelectedMinorMajorCode("");
  }, [minorMajorType]);

  function clampEndYear(nextStart: string, nextEnd: string) {
    if (!nextEnd) return "";

    const start = Number(nextStart);
    const end = Number(nextEnd);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return nextEnd;
    }

    if (end < start + 2) {
      return String(start + 2);
    }

    if (end > start + 7) {
      return String(start + 7);
    }

    return nextEnd;
  }

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
            <SearchableSelect
              id="courseCode"
              name="courseCode"
              label="Courses"
              placeholder="Select course"
              emptyLabel="No courses found"
              options={courseCode}
              value={selectedCourse}
              required
              onChange={setSelectedCourse}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <SearchableSelect
              id="areaOfStudy"
              name="areaOfStudy"
              label="Area of Study"
              placeholder={
                selectedCourse
                  ? "Select area of study"
                  : "Select a course first"
              }
              emptyLabel={
                selectedCourse
                  ? "No areas of study found"
                  : "Select a course first"
              }
              options={areaOfStudyOptions}
              value={selectedAos}
              disabled={!selectedCourse}
              required
              onChange={setSelectedAos}
            />
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
            <SearchableSelect
              id="minorMajorCode"
              name="minorMajorCode"
              label={`Select ${minorMajorType === "major" ? "Major" : minorMajorType === "minor" ? "Minor" : "Minor/Major"}`}
              placeholder={
                minorMajorType
                  ? `Select ${minorMajorType}`
                  : "Select type first"
              }
              emptyLabel={
                minorMajorType
                  ? `No ${minorMajorType} options found`
                  : "Select type first"
              }
              options={minorMajorOptions}
              value={selectedMinorMajorCode}
              disabled={!minorMajorType}
              onChange={setSelectedMinorMajorCode}
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
              value={yearStart}
              onChange={(event) => {
                const nextStart = event.target.value;
                setYearStart(nextStart);
                setYearEnd((current) => clampEndYear(nextStart, current));
              }}
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
              min={yearStart ? String(Number(yearStart) + 2) : "2022"}
              max={yearStart ? String(Number(yearStart) + 7) : "2040"}
              required
              value={yearEnd}
              onChange={(event) => {
                setYearEnd(clampEndYear(yearStart, event.target.value));
              }}
              className={inputClass}
            />
            <p className="mt-2 text-xs text-black/40">
              Course end must be between 2 and 7 years after course start.
            </p>
          </div>
        </div>
      </section>

      <div className="pt-1">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-black/90"
        >
          <Sparkles className="h-4 w-4" />
          Generate Course Plan
        </button>
      </div>
    </>
  );
}
