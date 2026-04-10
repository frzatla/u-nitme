"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ArrowUp, MessageSquare, Loader2 } from "lucide-react";

type Review = {
  title: string;
  url: string;
  score: number;
  numComments: number;
  subreddit: string;
};

type Props = {
  unit: { code: string; name: string } | null;
};

export default function UnitReviewModal({ unit }: Props) {
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

  if (!unit) return null;

  return (
    <div className="px-5 py-5">
      <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.12em] text-black/30">
        <span style={{ color: "#FF4500" }}>r/Monash</span> discussions
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
  );
}
