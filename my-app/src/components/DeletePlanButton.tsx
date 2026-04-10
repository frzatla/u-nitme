"use client";

type DeletePlanButtonProps = {
  planId: string;
  action: (formData: FormData) => Promise<void>;
};

export default function DeletePlanButton({
  planId,
  action,
}: DeletePlanButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Are you sure you want to delete this plan?",
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="planId" value={planId} />
      <button
        type="submit"
        className="inline-flex items-center gap-3 rounded-full border border-red-200 bg-white px-8 py-4 text-[15px] font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
