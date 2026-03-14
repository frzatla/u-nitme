export type Plan = {
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
