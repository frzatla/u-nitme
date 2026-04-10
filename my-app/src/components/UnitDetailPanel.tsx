"use client";

import { useEffect, useState } from "react";
import { X, BookOpen, MessageSquare } from "lucide-react";
import UnitHandbookCard from "./UnitHandbookCard";
import UnitReviewModal from "./UnitReviewModal";
import { UnitCategory } from "@/lib/types";

type PanelUnit = {
  code: string;
  name: string;
  category: UnitCategory;
  level: string;
  cp: number;
};

const categoryPillStyles: Record<UnitCategory, string> = {
  Core: "bg-[#719DEE] text-white",
  Major: "bg-[#79B98B] text-white",
  Minor: "bg-[#F5DF8E] text-black/70",
  Elective: "bg-[#DD8255] text-white",
  Specialisation: "bg-[#A07ED1] text-white",
};

type Tab = "handbook" | "reviews";

type Props = {
  unit: PanelUnit | null;
  onClose: () => void;
};

export default function UnitDetailPanel({ unit, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("handbook");

  // Reset tab when unit changes
  useEffect(() => {
    setTab("handbook");
  }, [unit?.code]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!unit) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />

      {/* Panel */}
      <div
        className="relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black/[0.06] bg-black px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
              <BookOpen className="h-4 w-4 text-white/80" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                  {unit.code}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${categoryPillStyles[unit.category]}`}
                >
                  {unit.category}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] leading-4 text-white/45 line-clamp-1">
                {unit.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5 text-white/60" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-black/[0.06]">
          <button
            onClick={() => setTab("handbook")}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors ${
              tab === "handbook"
                ? "border-b-2 border-black text-black"
                : "text-black/35 hover:text-black/60"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Handbook
          </button>
          <button
            onClick={() => setTab("reviews")}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors ${
              tab === "reviews"
                ? "border-b-2 border-black text-black"
                : "text-black/35 hover:text-black/60"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Reviews
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === "handbook" && <UnitHandbookCard unit={unit} />}
          {tab === "reviews" && <UnitReviewModal unit={unit} />}
        </div>

        {/* Footer */}
        <div className="border-t border-black/[0.06] px-5 py-3">
          <p className="text-[12px] text-black/25">
            {unit.cp} CP · Level {unit.level}
          </p>
        </div>
      </div>
    </div>
  );
}
