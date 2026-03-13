"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Brain, Calendar, Sparkles } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";

const features = [
  {
    title: "AI-Powered",
    description:
      "Generate personalized course plans based on your interests, major, and goals.",
    icon: Brain,
  },
  {
    title: "Smart Scheduling",
    description:
      "Units organized across semesters with an intuitive visual layout.",
    icon: Calendar,
  },
  {
    title: "Personalized",
    description:
      "Tailored recommendations matching your university, course, and interests.",
    icon: Sparkles,
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-stone-100 text-black">
      <header className="border-b border-black/10">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 md:px-10">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white">
              U
            </span>
            <span className="text-xl font-medium tracking-tight">U-NIT ME</span>
          </button>

          <SignInButton
            mode="redirect"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
          >
            <button className="your-styles">Sign In</button>
          </SignInButton>
        </div>
      </header>

      <section className="border-b border-black/10">
        <div className="mx-auto flex min-h-[560px] max-w-6xl items-center justify-center px-6 py-20 text-center md:px-10">
          <div className="w-full max-w-4xl">
            <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 py-2.5">
              <Sparkles className="h-4 w-4 text-black/70" />
              <span className="text-sm font-medium text-black/60">
                AI-Powered Course Planning
              </span>
            </div>

            <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="block text-black">Plan your degree,</span>
              <span className="block text-black/30">without the handbook.</span>
            </h1>

            <p className="mx-auto mt-10 max-w-3xl text-lg leading-8 text-black/45 md:text-xl">
              Reading in 2026??? Hell nahhh — just drop your details and let AI
              sort your entire degree out. Semester-by-semester, no stress.
            </p>

            <button
              onClick={() => router.push("/sign-in")}
              className="mt-12 inline-flex items-center gap-3 rounded-2xl bg-black px-8 py-4 text-lg font-semibold text-white transition hover:bg-black/90"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10 justify-items-center">
            {features.map(({ title, description, icon: Icon }) => (
              <div key={title} className="max-w-xs text-center">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-white mx-auto">
                  <Icon className="h-6 w-6 text-black/70" />
                </div>

                <h2 className="text-2xl font-semibold tracking-tight">
                  {title}
                </h2>

                <p className="mt-3 text-base leading-7 text-black/45">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 md:px-10">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-black/25">
            U-NIT ME — Your intelligent course planning assistant
          </p>
        </div>
      </footer>
    </main>
  );
}
