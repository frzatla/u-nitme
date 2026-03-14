"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, ArrowUp, MessageSquare, Loader2 } from "lucide-react";

const categoryPillStyles = {
  Core: "bg-black text-white border-black",
  Major: "bg-black/70 text-white border-black/70",
  Elective: "bg-white text-black/70 border-black/20",
  Minor: "bg-black/8 text-black/55 border-black/10",
};

export default function UnitDetailPanel({ unit, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!unit) return;

    setReviews([]);
    setError(null);
    setLoading(true);

    fetch(`/api/units/${unit.code}/reviews`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch reviews");
        return res.json();
      })
      .then((data) => setReviews(data))
      .catch(() => setError("Couldn't load Reddit posts right now."))
      .finally(() => setLoading(false));
  }, [unit?.code]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          unit ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-[−24px_0_60px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          unit ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black/[0.06] px-6 py-5">
          <div className="flex-1 pr-4">
            {unit && (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                      categoryPillStyles[unit.category] || categoryPillStyles.Core
                    }`}
                  >
                    {unit.category}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-black/25">
                    {unit.level}
                  </span>
                </div>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-black">
                  {unit.code}
                </h2>
                <p className="mt-1 text-[14px] leading-6 text-black/45">{unit.name}</p>
                <p className="mt-1 text-[13px] text-black/25">{unit.cp} CP</p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-black/10 text-black/40 transition hover:border-black/20 hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Reddit section */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-black/28">
            Reddit Reviews
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-[14px] text-black/35">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching Reddit...
            </div>
          )}

          {error && !loading && (
            <p className="text-[14px] text-black/35">{error}</p>
          )}

          {!loading && !error && reviews.length === 0 && (
            <p className="text-[14px] text-black/35">
              No Reddit posts found for {unit?.code}.
            </p>
          )}

          {!loading && reviews.length > 0 && (
            <div className="space-y-3">
              {reviews.map((post, i) => (
                <a
                  key={i}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-[14px] border border-black/[0.07] bg-[#fafaf9] p-4 transition hover:border-black/15 hover:bg-white"
                >
                  <p className="text-[14px] font-medium leading-5 text-black/80 line-clamp-3">
                    {post.title}
                  </p>

                  <div className="mt-3 flex items-center gap-4 text-[12px] text-black/30">
                    <span className="flex items-center gap-1">
                      <ArrowUp className="h-3 w-3" />
                      {post.score}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {post.numComments}
                    </span>
                    <span>r/{post.subreddit}</span>
                    <ExternalLink className="ml-auto h-3 w-3" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-black/[0.06] px-6 py-4">
          <p className="text-[11px] text-black/20">
            Posts sourced from Reddit · Not affiliated with Monash University
          </p>
        </div>
      </aside>
    </>
  );
}
