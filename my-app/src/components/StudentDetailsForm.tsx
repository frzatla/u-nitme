"use client";

import { FormEventHandler } from "react";
import StudentDetailsFormContent from "./StudentDetailsFormContent";

type StudentDetailsFormProps = {
  action?: string | ((formData: FormData) => void | Promise<void>);
  onSubmit?: (data: Record<string, FormDataEntryValue>) => void;
};

export default function StudentDetailsForm({
  action,
  onSubmit,
}: StudentDetailsFormProps) {
  const handleSubmit: FormEventHandler<HTMLFormElement> | undefined = onSubmit
    ? (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());
        onSubmit(data);
      }
    : undefined;

  return (
    <div className="rounded-3xl border border-black/10 bg-white px-7 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] md:px-8 md:py-9">
      <form action={action} onSubmit={handleSubmit} className="space-y-7">
        <StudentDetailsFormContent />
      </form>
    </div>
  );
}
