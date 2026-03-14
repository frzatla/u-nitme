import { HTMLProps } from "react";
import StudentDetailsFormContent from "./StudentDetailsFormContent";

export default function StudentDetailsForm({ action }: HTMLProps<"form">) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white px-7 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] md:px-8 md:py-9">
      <form action={action} className="space-y-7">
        <StudentDetailsFormContent />
      </form>
    </div>
  );
}
