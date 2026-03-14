"use client";

import { useEffect, useState } from "react";
import {
  X,
  ExternalLink,
  BookOpen,
  MapPin,
  ClipboardList,
  Loader2,
  GraduationCap,
  AlertCircle,
  Link,
} from "lucide-react";

type Offering = { period: string; location: string; mode: string };
type Assessment = { name: string; weight: string; type: string };
type RequisiteGroup = { connector: string; codes: string[] };
type Requisite = { type: string; groups: RequisiteGroup[] };

type HandbookData = {
  code: string;
  title: string;
  creditPoints: string;
  level: string;
  school: string;
  synopsis: string;
  workload: string;
  offerings: Offering[];
  assessments: Assessment[];
  requisites: Requisite[];
  handbookUrl: string;
};

type Props = {
  unit: { code: string; name: string } | null;
  onClose: () => void;
};

export default function UnitHandbookCard({ unit, onClose }: Props) {
  const [data, setData] = useState<HandbookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unit || unit.code === "ELECTIVE") return;

    setData(null);
    setError(null);
    setLoading(true);

    fetch(`/api/units/${unit.code}/handbook`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to fetch handbook"))
      .finally(() => setLoading(false));
  }, [unit?.code]);

  if (!unit) return null;

  // Deduplicate offerings by period+location
  const uniqueOfferings = data?.offerings.filter(
    (o, i, arr) => arr.findIndex((x) => x.period === o.period && x.location === o.location) === i
  ) ?? [];

  return (
    <div
      className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 duration-200"
      style={{ animationFillMode: "both" }}
    >
      <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black/[0.06] bg-black px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
              <BookOpen className="h-4 w-4 text-white/80" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                {unit.code}
              </p>
              <p className="text-[12px] text-white/45 leading-4 mt-0.5">Handbook 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5 text-white/60" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[min(60vh,480px)] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-black/20" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
              <AlertCircle className="h-5 w-5 text-black/20" />
              <p className="text-[13px] text-black/35">{error}</p>
              <a
                href={`https://handbook.monash.edu/2026/units/${unit.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-black/60 hover:text-black"
              >
                View on Monash Handbook
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {!loading && data && (
            <div className="divide-y divide-black/[0.05]">
              {/* Unit title + meta */}
              <div className="px-5 py-4">
                <p className="text-[16px] font-semibold tracking-[-0.03em] text-black leading-tight">
                  {data.title}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {data.school && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium text-black/50">
                      <GraduationCap className="h-3 w-3" />
                      {data.school}
                    </span>
                  )}
                  {data.level && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium text-black/50">
                      {data.level}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium text-black/50">
                    {data.creditPoints} CP
                  </span>
                </div>
              </div>

              {/* Synopsis */}
              {data.synopsis && (
                <div className="px-5 py-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black/25">
                    Synopsis
                  </p>
                  <p className="text-[13px] leading-5 text-black/55 line-clamp-4">
                    {data.synopsis}
                  </p>
                </div>
              )}

              {/* Offerings */}
              {uniqueOfferings.length > 0 && (
                <div className="px-5 py-4">
                  <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-black/25">
                    <MapPin className="h-3 w-3" />
                    Offerings
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueOfferings.map((o, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-black/[0.08] bg-black/[0.03] px-2.5 py-1 text-[12px] text-black/55"
                      >
                        {o.period}{o.location ? ` · ${o.location}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assessments */}
              {data.assessments.length > 0 && (
                <div className="px-5 py-4">
                  <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-black/25">
                    <ClipboardList className="h-3 w-3" />
                    Assessments
                  </p>
                  <ul className="space-y-1.5">
                    {data.assessments.map((a, i) => (
                      <li key={i} className="flex items-center justify-between gap-3">
                        <span className="text-[13px] text-black/60 min-w-0 truncate">{a.name}</span>
                        {a.weight && (
                          <span className="flex-shrink-0 rounded-full bg-black/[0.05] px-2.5 py-0.5 text-[11px] font-semibold text-black/40">
                            {a.weight}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requisites */}
              {data.requisites.length > 0 && (
                <div className="px-5 py-4">
                  <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-black/25">
                    <Link className="h-3 w-3" />
                    Requisites
                  </p>
                  <ul className="space-y-2">
                    {data.requisites.map((req, i) => (
                      <li key={i}>
                        <span className="mb-1 inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-black/35">
                          {req.type}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {req.groups.map((g, gi) => (
                            <span key={gi} className="flex items-center gap-1.5">
                              {gi > 0 && (
                                <span className="text-[11px] font-semibold uppercase text-black/25">and</span>
                              )}
                              <span className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-black/[0.08] bg-black/[0.03] px-2.5 py-1">
                                {g.codes.map((code, ci) => (
                                  <span key={ci} className="flex items-center gap-1">
                                    {ci > 0 && (
                                      <span className="text-[10px] text-black/25">{g.connector.toLowerCase()}</span>
                                    )}
                                    <span className="text-[12px] font-medium text-black/70">{code}</span>
                                  </span>
                                ))}
                              </span>
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer link */}
              <div className="px-5 py-3.5">
                <a
                  href={data.handbookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-black/45 transition hover:text-black"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View full handbook entry
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
