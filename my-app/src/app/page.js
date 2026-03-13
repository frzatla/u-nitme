"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Brain, Calendar, Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="w-full border-b border-black/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
              <span
                className="text-white text-sm"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                U
              </span>
            </div>
            <span
              className="tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              U-NIT ME
            </span>
          </div>

          <button
            onClick={() => router.push("/login")}
            className="text-sm text-black/60 hover:text-black transition-colors"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl w-full text-center">
          <div className="inline-flex items-center gap-2 border border-black/10 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-sm text-black/60">
              AI-Powered Course Planning
            </span>
          </div>

          <h1
            className="text-5xl md:text-6xl tracking-tight mb-6"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              lineHeight: 1.1,
            }}
          >
            Plan your degree,
            <br />
            <span className="text-black/40">without the handbook.</span>
          </h1>

          <p className="text-lg text-black/50 max-w-lg mx-auto mb-12 leading-relaxed">
            Reading in 2026??? Hell nahhh — just drop your details and let AI
            sort your entire degree out. Semester-by-semester, no stress.
          </p>

          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-3 bg-black text-white px-8 py-3.5 rounded-lg hover:bg-black/85 transition-colors"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Features strip */}
      <div className="border-t border-black/10 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="w-10 h-10 border border-black/15 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-5 w-5 text-black/70" />
              </div>
              <h3
                className="mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                AI-Powered
              </h3>
              <p className="text-sm text-black/50 leading-relaxed">
                Generate personalized course plans based on your interests,
                major, and goals.
              </p>
            </div>

            <div>
              <div className="w-10 h-10 border border-black/15 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-5 w-5 text-black/70" />
              </div>
              <h3
                className="mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Smart Scheduling
              </h3>
              <p className="text-sm text-black/50 leading-relaxed">
                Units organized across semesters with an intuitive visual
                layout.
              </p>
            </div>

            <div>
              <div className="w-10 h-10 border border-black/15 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-black/70" />
              </div>
              <h3
                className="mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Personalized
              </h3>
              <p className="text-sm text-black/50 leading-relaxed">
                Tailored recommendations matching your university, course, and
                interests.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-black/10 px-6 py-5">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs text-black/30">
            U-NIT ME — Your intelligent course planning assistant
          </p>
        </div>
      </div>
    </div>
  );
}
