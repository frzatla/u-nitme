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
        className="inline-flex items-center gap-2 rounded-full border border-black/12 bg-white px-5 py-3 text-sm font-medium text-black/58 transition-colors hover:border-black/20 hover:bg-black/[0.02] hover:text-black"
      >
        Delete
      </button>
    </form>
  );
}
