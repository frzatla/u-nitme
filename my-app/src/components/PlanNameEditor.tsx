"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { renamePlan } from "@/app/actions";

type Variant = "dashboard" | "planner";

type Props = {
  email: string;
  planId: string;
  initialName: string;
  fallbackName?: string;
  isPending?: boolean;
  variant?: Variant;
  headingLevel?: "h1" | "h2";
  onRenamed?: (name: string) => void;
};

const styles: Record<
  Variant,
  {
    wrapper: string;
    heading: string;
    editButton: string;
    form: string;
    input: string;
    actionButton: string;
  }
> = {
  dashboard: {
    wrapper: "flex min-w-0 items-start gap-3",
    heading:
      "min-w-0 break-words text-[42px] font-semibold leading-none tracking-[-0.06em] text-black",
    editButton:
      "mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black/35 transition hover:border-black/20 hover:text-black",
    form: "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center",
    input:
      "min-w-0 flex-1 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-[28px] font-semibold leading-none tracking-[-0.05em] text-black outline-none transition focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/[0.03]",
    actionButton:
      "flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black/45 transition hover:border-black/20 hover:text-black disabled:opacity-45",
  },
  planner: {
    wrapper: "flex min-w-0 items-center gap-3",
    heading:
      "min-w-0 break-words text-3xl font-semibold tracking-tight text-white md:text-4xl",
    editButton:
      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/45 transition hover:border-white/25 hover:text-white",
    form: "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center",
    input:
      "min-w-0 flex-1 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3 text-3xl font-semibold tracking-tight text-white outline-none transition placeholder:text-white/25 focus:border-white/30 focus:ring-4 focus:ring-white/[0.05] md:text-4xl",
    actionButton:
      "flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/50 transition hover:border-white/25 hover:text-white disabled:opacity-45",
  },
};

export default function PlanNameEditor({
  email,
  planId,
  initialName,
  fallbackName = "Course Plan",
  isPending = false,
  variant = "dashboard",
  headingLevel = "h2",
  onRenamed,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [isPendingUpdate, startTransition] = useTransition();
  const ui = styles[variant];
  const displayName = name.trim() || fallbackName;
  const Heading = headingLevel;

  function cancelEdit() {
    setDraft(name);
    setEditing(false);
    setError("");
  }

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextName = draft.trim();
    if (!nextName) {
      setError("Plan name cannot be empty.");
      return;
    }

    if (nextName === name.trim()) {
      setEditing(false);
      setError("");
      return;
    }

    setError("");
    startTransition(() => {
      void (async () => {
        try {
          await renamePlan(email, planId, nextName, isPending);
          setName(nextName);
          setDraft(nextName);
          setEditing(false);
          onRenamed?.(nextName);
          router.refresh();
        } catch {
          setError("Could not rename this plan.");
        }
      })();
    });
  }

  if (editing) {
    return (
      <div>
        <form onSubmit={submitName} className={ui.form}>
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={ui.input}
            maxLength={80}
            placeholder={fallbackName}
            aria-label="Plan name"
            disabled={isPendingUpdate}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPendingUpdate}
              className={ui.actionButton}
              aria-label="Save plan name"
              title="Save plan name"
            >
              {isPendingUpdate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPendingUpdate}
              className={ui.actionButton}
              aria-label="Cancel rename"
              title="Cancel rename"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className={ui.wrapper}>
      <Heading className={ui.heading}>{displayName}</Heading>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={ui.editButton}
        aria-label={`Edit ${displayName} plan name`}
        title="Edit plan name"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
