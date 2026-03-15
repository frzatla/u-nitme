"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Send, Bot, Sparkles, Plus, BookOpen } from "lucide-react";
import { Unit } from "./CoursePlanner";

type EsUnit = {
  code: string;
  title: string;
  level: number;
  credit_points: number;
  school: string;
  offerings?: { period: string; location: string }[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Tab = "search" | "chat";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelectUnit: (unit: Unit) => void;
};

function toCoursePlannerUnit(u: EsUnit): Unit {
  return {
    code: u.code,
    name: u.title,
    category: "Elective",
    level: u.level ? `L${u.level}` : "—",
    cp: typeof u.credit_points === "number" ? u.credit_points : parseInt(String(u.credit_points)) || 6,
  };
}

function UnitResultCard({
  unit,
  onAdd,
}: {
  unit: EsUnit;
  onAdd: (unit: EsUnit) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-black/10 bg-white p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#DD8255]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#DD8255]">
            {unit.code}
          </span>
          {unit.level && (
            <span className="text-[11px] text-black/30">L{unit.level}</span>
          )}
          <span className="text-[11px] text-black/30">
            {unit.credit_points ?? 6} CP
          </span>
        </div>
        <p className="mt-1.5 text-[14px] font-medium text-black leading-snug">
          {unit.title}
        </p>
        {unit.school && (
          <p className="mt-0.5 text-[12px] text-black/40 truncate">{unit.school}</p>
        )}
        {unit.offerings && unit.offerings.length > 0 && (
          <p className="mt-1 text-[11px] text-black/30">
            {unit.offerings.map((o) => o.period).slice(0, 2).join(" · ")}
          </p>
        )}
      </div>
      <button
        onClick={() => onAdd(unit)}
        className="flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-[12px] font-medium text-white transition hover:bg-black/80"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
    </div>
  );
}

function SearchTab({
  onSelectUnit,
}: {
  onSelectUnit: (unit: Unit) => void;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [results, setResults] = useState<EsUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function doSearch(q: string, lvl: string) {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ q, ...(lvl ? { level: lvl } : {}) });
    fetch(`/api/units/search?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.units ?? []);
        setSearched(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val, level), 350);
  }

  function handleLevelChange(val: string) {
    setLevel(val);
    doSearch(query, val);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search inputs */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by code, topic, or keyword…"
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-[14px] outline-none placeholder:text-black/30 focus:border-black/20 focus:ring-2 focus:ring-black/5"
            autoFocus
          />
        </div>
        <select
          value={level}
          onChange={(e) => handleLevelChange(e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[13px] text-black/60 outline-none focus:border-black/20"
        >
          <option value="">All levels</option>
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
          <option value="3">Level 3</option>
          <option value="4">Level 4</option>
        </select>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-[14px] text-black/40">
          Searching…
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <BookOpen className="h-8 w-8 text-black/20" />
          <p className="text-[14px] text-black/40">No units found. Try different keywords.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((unit) => (
            <UnitResultCard
              key={unit.code}
              unit={unit}
              onAdd={(u) => onSelectUnit(toCoursePlannerUnit(u))}
            />
          ))}
        </div>
      )}

      {!searched && !loading && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Search className="h-8 w-8 text-black/12" />
          <p className="text-[14px] text-black/30">
            Search across 5,000+ Monash units
          </p>
        </div>
      )}
    </div>
  );
}

function ChatTab({ onSelectUnit }: { onSelectUnit: (unit: Unit) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I can help you find the perfect free elective. Tell me about your interests, the skills you want to build, or what topics excite you — and I'll suggest some units you might love.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Build API payload — exclude the initial greeting (assistant only, index 0)
    const apiMessages = newMessages
      .slice(1) // skip initial greeting
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/units/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text ?? "Sorry, something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-0" style={{ height: "100%" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4" style={{ minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-black">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-black text-white"
                  : "bg-[#f5f5f4] text-black"
              }`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-black">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="rounded-2xl bg-[#f5f5f4] px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-black/30 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-black/[0.06] pt-4 mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about units, topics, or skills…"
          disabled={loading}
          className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[14px] outline-none placeholder:text-black/30 focus:border-black/20 focus:ring-2 focus:ring-black/5 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white transition hover:bg-black/80 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ElectiveSearch({ isOpen, onClose, onSelectUnit }: Props) {
  const [tab, setTab] = useState<Tab>("search");

  // Reset to search tab when modal opens
  useEffect(() => {
    if (isOpen) setTab("search");
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSelect(unit: Unit) {
    onSelectUnit(unit);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[28px] bg-[#fafaf9] shadow-2xl md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:rounded-[28px]"
        style={{ maxHeight: "85dvh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-black">
              Find a Free Elective
            </h2>
            <p className="mt-0.5 text-[13px] text-black/40">
              Search or ask AI to discover units
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-black/50 transition hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pb-4">
          <button
            onClick={() => setTab("search")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium transition ${
              tab === "search"
                ? "bg-black text-white"
                : "bg-black/[0.04] text-black/55 hover:bg-black/[0.07]"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium transition ${
              tab === "chat"
                ? "bg-black text-white"
                : "bg-black/[0.04] text-black/55 hover:bg-black/[0.07]"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            Ask ChatJKW
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-6 pb-6" style={{ minHeight: 0 }}>
          {tab === "search" ? (
            <div className="overflow-y-auto" style={{ maxHeight: "calc(85dvh - 170px)" }}>
              <SearchTab onSelectUnit={handleSelect} />
            </div>
          ) : (
            <div className="flex flex-col" style={{ height: "calc(85dvh - 170px)" }}>
              <ChatTab onSelectUnit={handleSelect} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
