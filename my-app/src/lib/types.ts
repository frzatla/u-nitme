export type Plan = {
  id: string;
  planName: string;
  courses: string;
  university: string;
  areaOfStudy: string;
  semesterOffering: string;
  yearStart: number | string;
  yearEnd: number | string;
  schedule?: Schedule;
  saved?: boolean;
};

export type Profile = {
  id?: string;
  email: string;
  plans: Plan[];
};

export type YearGroup = {
  year: number;
  yearLabel: string;
  semesters: Semester[];
};

export type Semester = {
  id: string;
  title: string;
  year: number;
  units: ChosenUnit[]; // each semester only have 4 units
};

export type ChosenUnit = {
  chosenId: number;
  unitCode: number;
  unitName: string;
  category: string;
  cp: number;
  chosenYear: number;
  chosenSem: string;
};

// ── algo1.py output types ─────────────────────────────────────────────────────

export type UnitCategory = "Core" | "Major" | "Minor" | "Elective" | "Specialisation";

export type ScheduledUnit = {
  code: string;
  title: string;
  credit_points: number;
  level: number | null;
  chain_length: number | null;
  extended: boolean | null;
  category: UnitCategory;
};

export type ScheduledSemester = {
  semester: string;        // e.g. "Year 1, Semester 1"
  period: string | null;   // "S1" | "S2" | null (null = unscheduled bucket)
  semester_index: number;
  extended: boolean | null;
  units: ScheduledUnit[];
  fixed_cp: number;
  total_cp: number;
  cumulative_cp: number;
};

export type Schedule = {
  course_code: string;
  course_title: string;
  specialisation: string | null;
  major: string | null;
  minor: string | null;
  campus: string;
  summary: {
    total_units: number;
    total_cp: number;
    scheduled_cp: number;
    semesters: number;
  };
  schedule: ScheduledSemester[];
};
