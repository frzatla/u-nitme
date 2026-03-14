export type Plan = {
  university: string;
  faculty: string;
  degree: string;
  specialisation: string | null;
  major: string | null;
  minor: string | null;
  semesterOffering: string;
  yearStart: number | string;
  yearEnd: number | string;
};

export type Profile = {
  id?: string;
  email: string;
  plans: Plan[];
};
