"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Brain,
  Calendar,
  Sparkles,
  Quote,
  Zap,
  MousePointerClick,
  ChevronRight,
  GraduationCap,
  Clock,
  Star,
  Heart,
  Users,
} from "lucide-react";
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

const steps = [
  {
    num: "01",
    title: "Drop your details",
    desc: "University, faculty, major, specialisation — the basics. Takes about 15 seconds.",
    icon: MousePointerClick,
  },
  {
    num: "02",
    title: "AI does its thing",
    desc: "Our engine maps your details into a cleaner semester-by-semester course plan.",
    icon: Zap,
  },
  {
    num: "03",
    title: "Get your plan",
    desc: "A clear study plan you can review, screenshot, and build on with less stress.",
    icon: GraduationCap,
  },
];

const reviews = [
  {
    name: "Sarah K.",
    course: "Computer Science, UniMelb",
    text: "Spent hours trying to sort my study plan. Used U-NIT ME and got clarity almost instantly. So much easier than reading the handbook.",
    rating: 5,
  },
  {
    name: "James T.",
    course: "Software Engineering, Monash",
    text: "The layout is so clean and it actually makes planning feel manageable. Way less overwhelming than doing it manually.",
    rating: 5,
  },
  {
    name: "Priya M.",
    course: "Data Science, UNSW",
    text: "I liked that it gave structure to everything. It helped me think more clearly about what I actually want to study.",
    rating: 5,
  },
];

const faqs = [
  {
    q: "Is it actually free?",
    a: "Yes. This is built to make course planning easier for students without adding more friction.",
  },
  {
    q: "Will it work for every university?",
    a: "Not all universities yet, but the goal is to expand support over time. Right now the experience is focused and simple.",
  },
  {
    q: "Can I trust the recommendations fully?",
    a: "Use it as a planning assistant. It helps organize your options, but you should still cross-check with official university information before final enrolment decisions.",
  },
  {
    q: "What if I change my major or interests later?",
    a: "That’s fine. You can come back, update your details, and generate a new plan that better fits your new direction.",
  },
];

const valueCards = [
  {
    title: "Student-First",
    description: "Designed around real student pain points",
    icon: Heart,
  },
  {
    title: "Fast AF",
    description: "Plans generated in under 30 seconds",
    icon: Zap,
  },
  {
    title: "Community",
    description: "Thousands of students already on board",
    icon: Users,
  },
  {
    title: "Always Free",
    description: "No subscriptions, no hidden fees, ever",
    icon: Clock,
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#f5f5f4] text-black">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f5f5f4]/85 backdrop-blur-md">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 md:px-10">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white shadow-sm">
              U
            </span>
            <span className="text-xl font-semibold tracking-tight">
              U-NIT ME
            </span>
          </button>

          <SignInButton
            mode="redirect"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
          >
            <button className="rounded-xl px-4 py-2 text-sm font-medium text-black/60 transition hover:bg-black/[0.04] hover:text-black">
              Sign In
            </button>
          </SignInButton>
        </div>
      </header>

      <section className="border-b border-black/10">
        <div className="mx-auto flex min-h-[620px] max-w-6xl items-center justify-center px-6 py-24 text-center md:px-10">
          <div className="w-full max-w-4xl">
            <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <Sparkles className="h-4 w-4 text-black/70" />
              <span className="text-sm font-medium text-black/60">
                AI-Powered Course Planning
              </span>
            </div>

            <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="block text-black">Plan your degree,</span>
              <span className="block text-black/28">without the handbook.</span>
            </h1>

            <p className="mx-auto mt-10 max-w-3xl text-lg leading-8 text-black/45 md:text-xl">
              Reading in 2026??? Hell nahhh — just drop your details and let AI
              sort your entire degree out. Semester-by-semester, no stress.
            </p>

            <div className="mt-12 flex items-center justify-center gap-4">
              <button
                onClick={() => router.push("/sign-in")}
                className="inline-flex items-center gap-3 rounded-2xl bg-black px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-black/90"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-2xl border border-black/10 bg-white px-6 py-4 text-sm font-medium text-black/65 transition hover:border-black/20 hover:text-black"
              >
                See how it works
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10 justify-items-center">
            {features.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="group max-w-xs rounded-3xl border border-transparent p-4 text-center transition hover:border-black/8 hover:bg-white"
              >
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-[#fafaf9] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition group-hover:-translate-y-0.5">
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

      <section
        id="how-it-works"
        className="border-b border-black/10 bg-black/[0.02]"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/30">
              How It Works
            </div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Three steps. That&apos;s it.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.num}
                className="group rounded-3xl border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)]"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-3xl font-semibold tracking-tighter text-black/10">
                    {step.num}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-[#fafaf9]">
                    <step.icon className="h-4 w-4 text-black/50" />
                  </div>
                </div>

                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-black/45">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/30">
              Student Reviews
            </div>
            <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Don&apos;t take our word for it
            </h2>
            <p className="text-sm text-black/40">
              Real students. Real plans. Real relief.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, i) => (
              <div
                key={i}
                className="group flex flex-col rounded-3xl border border-black/10 bg-[#fcfcfb] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_16px_30px_rgba(0,0,0,0.04)]"
              >
                <Quote className="mb-4 h-5 w-5 text-black/10" />

                <p className="mb-5 flex-1 text-sm leading-relaxed text-black/60">
                  &quot;{review.text}&quot;
                </p>

                <div className="flex items-center justify-between border-t border-black/[0.06] pt-4">
                  <div>
                    <div className="text-sm font-medium">{review.name}</div>
                    <div className="text-xs text-black/35">{review.course}</div>
                  </div>

                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-3.5 w-3.5 fill-black/70 text-black/70"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-black/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <div className="mb-16 text-center">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/30">
              About U-NIT ME
            </div>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-5xl">
              Built by students,{" "}
              <span className="text-black/35">for students.</span>
            </h2>
            <p className="mx-auto max-w-md text-sm text-black/40 md:text-base">
              We got tired of the handbook grind. So we made something better.
            </p>
          </div>

          <div className="mb-14 grid gap-6 md:grid-cols-12">
            <div className="relative overflow-hidden rounded-[28px] border border-black/10 md:col-span-7">
              <img
                src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=80"
                alt="Student studying"
                className="h-[540px] w-full object-cover grayscale transition duration-700 hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              <div className="absolute bottom-0 left-0 p-7">
                <p className="max-w-sm text-lg leading-relaxed text-white/95">
                  &quot;We spent more time reading the handbook than actually
                  studying. That had to change.&quot;
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6 md:col-span-5">
              <div className="relative overflow-hidden rounded-[28px] border border-black/10">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
                  alt="Students collaborating"
                  className="h-[257px] w-full object-cover grayscale transition duration-700 hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5 text-xs font-medium uppercase tracking-[0.18em] text-white/85">
                  The Team
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-black/10">
                <img
                  src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80"
                  alt="Planning workspace"
                  className="h-[257px] w-full object-cover grayscale transition duration-700 hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5 text-xs font-medium uppercase tracking-[0.18em] text-white/85">
                  The Problem
                </div>
              </div>
            </div>
          </div>

          <div className="grid items-start gap-12 md:grid-cols-2">
            <div className="space-y-6 text-lg leading-relaxed text-black/50">
              <p>
                We got tired of spending hours cross-referencing handbooks,
                prerequisite chains, and course maps just to figure out what to
                enrol in next semester.
              </p>

              <p>
                So we built U-NIT ME — an AI-powered tool that does all of that
                in seconds. No more guesswork, no more anxiety, no more
                &quot;wait, can I even take that unit in semester 2?&quot;
              </p>

              <p>
                We&apos;re a small team of uni students who believe course
                planning shouldn&apos;t require a PhD in spreadsheet management.
              </p>

              <div className="flex items-center gap-10 border-t border-black/10 pt-6">
                <div>
                  <div className="text-4xl font-semibold tracking-tight text-black/55">
                    2026
                  </div>
                  <div className="mt-1 text-sm text-black/30">Founded</div>
                </div>

                <div className="h-12 w-px bg-black/10" />

                <div>
                  <div className="text-4xl font-semibold tracking-tight text-black/55">
                    6
                  </div>
                  <div className="mt-1 text-sm text-black/30">Team Members</div>
                </div>

                <div className="h-12 w-px bg-black/10" />

                <div>
                  <div className="text-4xl font-semibold tracking-tight text-black/55">
                    ∞
                  </div>
                  <div className="mt-1 text-sm text-black/30">
                    Handbook Rage
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {valueCards.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-3xl border border-black/10 bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_14px_30px_rgba(0,0,0,0.04)]"
                >
                  <Icon className="mx-auto mb-4 h-6 w-6 text-black/45" />
                  <div className="text-lg font-semibold">{title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-black/35">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20 md:px-10">
          <div className="mb-12 text-center">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/30">
              Quick Questions
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Yeah but...
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-black/10 bg-white p-5 transition hover:border-black/20 hover:bg-[#fcfcfb]"
              >
                <div className="flex items-start gap-3">
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-black/25" />
                  <div>
                    <div className="mb-1.5 text-sm font-medium">{faq.q}</div>
                    <p className="text-sm leading-relaxed text-black/45">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-10">
          <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Ready to stop stressing?
          </h2>

          <p className="mx-auto mb-8 max-w-md text-sm text-white/40">
            Join students who want a faster, cleaner way to think about their
            degree plan.
          </p>

          <button
            onClick={() => router.push("/sign-in")}
            className="inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Plan My Degree
            <ArrowRight className="h-4 w-4" />
          </button>
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
