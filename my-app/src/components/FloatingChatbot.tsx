"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type FloatingChatbotProps = {
  context?: string;
  greeting?: string;
};

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      elements.push(<div key={index} className="h-1" />);
      index++;
    } else if (/^[*-]\s+/.test(trimmed)) {
      const bullets: string[] = [];

      while (index < lines.length && /^[*-]\s+/.test(lines[index].trim())) {
        bullets.push(lines[index].trim().replace(/^[*-]\s+/, ""));
        index++;
      }

      elements.push(
        <ul key={`ul-${index}`} className="space-y-1">
          {bullets.map((bullet, bulletIndex) => (
            <li key={bulletIndex} className="flex items-start gap-2">
              <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-black/40" />
              <span>{renderInline(bullet)}</span>
            </li>
          ))}
        </ul>,
      );
    } else {
      elements.push(<p key={index}>{renderInline(trimmed)}</p>);
      index++;
    }
  }

  return (
    <div className="space-y-1.5 text-[14px] leading-relaxed">{elements}</div>
  );
}

function RobotToggleIcon() {
  const pupilStyle = {
    transform: "translate(var(--robot-eye-x, 0px), var(--robot-eye-y, 0px))",
  };

  return (
    <span className="relative flex h-[4.5rem] w-[4.5rem] flex-shrink-0 items-center justify-center">
      <span className="absolute left-1/2 top-1 h-3.5 w-px -translate-x-1/2 bg-white/55" />
      <span className="absolute left-1/2 top-0 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border border-white/35 bg-[#F5DF8E] shadow-[0_0_18px_rgba(245,223,142,0.5)]">
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
      <span className="absolute left-1/2 top-[13px] h-2 w-7 -translate-x-1/2 rounded-full bg-white/75" />
      <span className="relative mt-4 flex h-12 w-14 items-center justify-center rounded-[18px] border border-white/25 bg-white shadow-[inset_0_-8px_14px_rgba(0,0,0,0.1),0_2px_0_rgba(255,255,255,0.18)] transition-transform duration-200 group-hover:-rotate-2">
        <span className="absolute -left-2 top-5 h-[18px] w-2 rounded-l-full border border-white/20 bg-white/80" />
        <span className="absolute -right-2 top-5 h-[18px] w-2 rounded-r-full border border-white/20 bg-white/80" />
        <span className="absolute left-2 top-3 h-2 w-3 rounded-full bg-[#F5B7B1]/70" />
        <span className="absolute right-2 top-3 h-2 w-3 rounded-full bg-[#F5B7B1]/70" />
        <span className="absolute left-1/2 top-[15px] flex -translate-x-1/2 items-center gap-2">
          {[0, 1].map((eye) => (
            <span
              key={eye}
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black shadow-[inset_0_1px_3px_rgba(255,255,255,0.18)]"
            >
              <span
                className="h-2 w-2 rounded-full bg-white transition-transform duration-75 ease-out"
                style={pupilStyle}
              />
            </span>
          ))}
        </span>
        <span className="absolute bottom-3 left-1/2 h-2.5 w-5 -translate-x-1/2 rounded-b-full border-b-2 border-black/45" />
        <span className="absolute bottom-[11px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#F5B7B1]/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </span>
    </span>
  );
}

const GREETING = "Hi! Ask me anything about your course plan, dashboard, units, prerequisites, or what to check next.";

export default function FloatingChatbot({
  context,
  greeting = GREETING,
}: FloatingChatbotProps) {
  const [sessionId] = useState<string>(() => {
    if (typeof window === "undefined") return crypto.randomUUID();
    const stored = sessionStorage.getItem("floating-chat-session");
    if (stored) return stored;
    const id = crypto.randomUUID();
    sessionStorage.setItem("floating-chat-session", id);
    return id;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: greeting },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const robotButtonRef = useRef<HTMLButtonElement>(null);

  // Load existing session history from Redis on mount
  useEffect(() => {
    fetch(`/api/chat?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages([{ role: "assistant", content: greeting }, ...data.messages]);
        }
      })
      .catch(() => {});
  }, [sessionId, greeting]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isOpen]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  useEffect(() => {
    function moveEyes(event: PointerEvent) {
      const button = robotButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
      const maxMove = 4;
      const eyeX = (deltaX / distance) * maxMove;
      const eyeY = (deltaY / distance) * maxMove;

      button.style.setProperty("--robot-eye-x", `${eyeX.toFixed(2)}px`);
      button.style.setProperty("--robot-eye-y", `${eyeY.toFixed(2)}px`);
    }

    function resetEyes() {
      const button = robotButtonRef.current;
      if (!button) return;

      button.style.setProperty("--robot-eye-x", "0px");
      button.style.setProperty("--robot-eye-y", "0px");
    }

    window.addEventListener("pointermove", moveEyes);
    window.addEventListener("pointerleave", resetEyes);

    return () => {
      window.removeEventListener("pointermove", moveEyes);
      window.removeEventListener("pointerleave", resetEyes);
    };
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, newMessage: text, context }),
      });
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text ?? "Sorry, I could not answer that right now." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I could not connect. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 md:bottom-7 md:right-7">
      {isOpen && (
        <div className="flex h-[min(620px,calc(100dvh-7rem))] w-[calc(100vw-2.5rem)] max-w-[390px] flex-col overflow-hidden rounded-[24px] border border-black/10 bg-[#fafaf9] shadow-2xl">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] text-black/40">
                  Course planning help
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-black/45 transition hover:bg-black/[0.04] hover:text-black"
              aria-label="Close ChatJKW"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-black text-[14px] leading-relaxed text-white"
                      : "bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownMessage content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30"
                        style={{ animationDelay: `${dot * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-black/[0.06] bg-[#fafaf9] p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) sendMessage();
                }}
                placeholder="Ask a course planning question..."
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[14px] outline-none placeholder:text-black/30 focus:border-black/20 focus:ring-2 focus:ring-black/5 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-black text-white transition hover:bg-black/80 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        ref={robotButtonRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="group inline-flex h-24 w-24 items-center justify-center rounded-[34px] bg-black p-0 text-sm font-medium text-white shadow-[0_18px_60px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:bg-black/85"
        aria-label={isOpen ? "Close ChatJKW" : "Open ChatJKW"}
      >
        <RobotToggleIcon />
      </button>
    </div>
  );
}
