export type Plan = {
  id: string;
  planName: string;
  courses: string;
  university: string;
  areaOfStudy: string;
  semesterOffering: string;
  yearStart: number | string;
  yearEnd: number | string;
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
