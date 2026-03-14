"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, ArrowUp, MessageSquare, Loader2 } from "lucide-react";

// Shape returned by /api/units/[code]/reviews
type Review = {
  title: string;
  url: string;
  score: number;
  numComments: number;
  subreddit: string;
};

type Props = {
  unit: { code: string; name: string; category: string; cp: number } | null;
  onClose: () => void;
};

export default function UnitReviewModal({ unit, onClose }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unit || unit.code === "ELECTIVE") return;

    setReviews([]);
    setError(null);
    setLoading(true);

    fetch(`/api/units/${unit.code}/reviews`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setReviews(data);
      })
      .catch(() => setError("Failed to fetch reviews"))
      .finally(() => setLoading(false));
  }, [unit?.code]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!unit) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Side panel */}
      <div
        className="relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black/[0.06] px-6 py-5">
          <div>
            <p className="text-[18px] font-semibold tracking-[-0.03em] text-black">
              {unit.code}
            </p>
            <p className="mt-0.5 text-[13px] text-black/45">{unit.name}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black/[0.05] transition hover:bg-black/10"
          >
            <X className="h-4 w-4 text-black/50" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.12em] text-black/30">
            r/Monash discussions
          </p>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-black/25" />
            </div>
          )}

          {!loading && error && (
            <p className="py-6 text-center text-[14px] text-black/35">{error}</p>
          )}

          {!loading && !error && reviews.length === 0 && (
            <p className="py-6 text-center text-[14px] text-black/35">
              No Reddit discussions found for {unit.code}.
            </p>
          )}

          {!loading && reviews.length > 0 && (
            <ul className="space-y-3">
              {reviews.map((r, i) => (
                <li key={i}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 rounded-[14px] border border-black/[0.07] bg-black/[0.02] p-4 transition hover:border-black/15 hover:bg-black/[0.04]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium leading-5 text-black/80 group-hover:text-black">
                        {r.title}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[12px] text-black/30">
                        <span className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3" />
                          {r.score}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {r.numComments}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-black/20 group-hover:text-black/40" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
