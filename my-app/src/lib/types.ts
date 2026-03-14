export type Plan = {
  planName: string;
  university: string;
  courses: string;
  areaOfStudy: string;
  unitOffering: string;
  yearStart: number | string;
  yearEnd: number | string;
};

export type Profile = {
  id?: string;
  email: string;
  plans: Plan[];
};
