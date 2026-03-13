"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Calendar,
  Sparkles,
  Quote,
  Zap,
  MousePointerClick,
  GraduationCap,
  Clock,
  Star,
  Heart,
  Users,
  BookOpen,
  Layers,
  Target,
  Minus,
  Plus,
} from "lucide-react";
import { SignInButton } from "@clerk/nextjs";

const capabilities = [
  {
    num: "01",
    title: "AI-Powered Engine",
    desc: "Maps course requirements, prerequisites, and your academic direction into a plan that feels structured instead of chaotic.",
    icon: Brain,
  },
  {
    num: "02",
    title: "Semester Planning",
    desc: "Builds a cleaner semester-by-semester breakdown so you can think ahead without getting buried in handbook pages.",
    icon: Calendar,
  },
  {
    num: "03",
    title: "Major + Minor Support",
    desc: "Designed to handle real student complexity — majors, minors, specialisations, and changing priorities.",
    icon: Layers,
  },
  {
    num: "04",
    title: "Goal-Aware Suggestions",
    desc: "Recommendations are shaped around what you actually want to pursue, not just a generic checklist.",
    icon: Target,
  },
  {
    num: "05",
    title: "Fast Regeneration",
    desc: "Changed your mind? Update your details and generate a fresh course structure in seconds.",
    icon: Zap,
  },
  {
    num: "06",
    title: "Plan With Confidence",
    desc: "Use the generated plan as a strong starting point before checking official handbook requirements.",
    icon: BookOpen,
  },
];

const steps = [
  {
    num: "01",
    title: "Drop your details",
    desc: "University, faculty, specialisation, and timeline — just the essentials.",
    icon: MousePointerClick,
  },
  {
    num: "02",
    title: "AI does the sorting",
    desc: "The system organizes your study direction into something readable, balanced, and easier to act on.",
    icon: Zap,
  },
  {
    num: "03",
    title: "Get your plan",
    desc: "Review a cleaner semester-by-semester path and refine it from there.",
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
  {
    name: "Liam W.",
    course: "IT, UTS",
    text: "The best part is that it removes the messy first step. I could finally focus on decisions instead of decoding handbook pages.",
    rating: 4,
  },
  {
    name: "Aisha R.",
    course: "Cybersecurity, RMIT",
    text: "Clean, simple, and actually useful. It feels like something made by people who understand how stressful this process is.",
    rating: 5,
  },
  {
    name: "Daniel C.",
    course: "Information Systems, UQ",
    text: "It made course planning feel much less intimidating. I wish I had this when I first started uni.",
    rating: 5,
  },
];

const faqs = [
  {
    q: "Is it actually free?",
    a: "Yes. The goal is to make planning easier for students without adding more cost or complexity.",
  },
  {
    q: "Will it work for every university?",
    a: "Not every university immediately, but the intention is to expand support progressively over time.",
  },
  {
    q: "Can I trust the recommendations fully?",
    a: "Use the generated output as a planning assistant. You should still verify final enrolment decisions against official university information.",
  },
  {
    q: "What if I change my major or interests later?",
    a: "That’s part of the point. You can return, update your inputs, and generate a new plan that better reflects your direction.",
  },
];

const valueCards = [
  {
    title: "Student-First",
    description: "Built around real student planning pain points",
    icon: Heart,
  },
  {
    title: "Fast AF",
    description: "Useful structure in under 30 seconds",
    icon: Zap,
  },
  {
    title: "Community",
    description: "Designed for the students who need this most",
    icon: Users,
  },
  {
    title: "Always Free",
    description: "No subscriptions, no hidden fees, ever",
    icon: Clock,
  },
];

function RevealLine({ children, delay = 0, className = "" }) {
  return (
    <div className={`overflow-hidden pb-[0.12em] ${className}`}>
      <motion.div
        initial={{ y: "110%", opacity: 0 }}
        whileInView={{ y: "0%", opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function HeroRevealLine({ children, delay = 0, className = "" }) {
  return (
    <div className={`overflow-hidden pb-[0.12em] ${className}`}>
      <motion.div
        initial={{ y: "110%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function FadeUp({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerGrid({ children, className = "" }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className = "" }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FaqItem({ faq, index, openIndex, setOpenIndex }) {
  const isOpen = openIndex === index;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.7,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="border-b border-white/[0.18]"
    >
      <button
        onClick={() => setOpenIndex(isOpen ? null : index)}
        className="flex w-full items-center justify-between gap-6 py-7 text-left md:py-9"
      >
        <div className="flex items-center gap-5">
          <span className="text-xs tracking-[0.2em] text-white">
            0{index + 1}
          </span>
          <span className="text-lg text-white md:text-xl">{faq.q}</span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.35 }}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.28]"
        >
          {isOpen ? (
            <Minus className="h-3.5 w-3.5 text-white" />
          ) : (
            <Plus className="h-3.5 w-3.5 text-white" />
          )}
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-8 pl-10 pr-12 md:pl-14">
              <p className="max-w-2xl text-sm leading-7 text-white md:text-base">
                {faq.a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState(0);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.2]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  const marqueeItems = useMemo(
    () => [
      "AI-Powered",
      "Semester Planning",
      "Prerequisites",
      "Course Mapping",
      "Smarter Scheduling",
      "Major + Minor Support",
      "Built for Students",
      "Free Forever",
    ],
    [],
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.18] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 md:px-10">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] text-sm font-semibold text-white">
              U
            </span>
            <span className="text-sm font-medium uppercase tracking-[0.18em] text-white/82">
              U-NIT ME
            </span>
          </button>

          <SignInButton
            mode="redirect"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
          >
            <button className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/65 transition hover:text-white">
              Sign In
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </SignInButton>
        </div>
      </header>

      <section
        ref={heroRef}
        className="relative overflow-hidden border-b border-white/[0.18]"
      >
        <motion.div
          style={{ y: glowY }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(255,255,255,0.12),transparent)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.02))]" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative mx-auto flex min-h-[92vh] max-w-7xl items-end px-6 pb-20 pt-24 md:px-10 md:pb-24"
        >
          <div className="w-full">
            <FadeUp delay={0.1}>
              <div className="mb-8 text-xs uppercase tracking-[0.3em] text-white">
                Edition — 2026
              </div>
            </FadeUp>

            <div className="max-w-6xl">
              <HeroRevealLine>
                <h1 className="text-[clamp(3.5rem,10vw,8.5rem)] font-semibold leading-[0.88] tracking-[-0.08em] text-white">
                  Plan your
                </h1>
              </HeroRevealLine>

              <HeroRevealLine delay={0.08}>
                <h1 className="text-[clamp(3.5rem,10vw,8.5rem)] font-semibold leading-[0.88] tracking-[-0.08em] text-white">
                  entire degree.
                </h1>
              </HeroRevealLine>
            </div>

            <div className="mt-12 flex flex-col justify-between gap-10 md:flex-row md:items-end">
              <FadeUp delay={0.25}>
                <p className="max-w-md text-base leading-8 text-white md:text-lg">
                  Reading in 2026??? Hell nahhh — just drop your details and let
                  AI sort your entire degree out. Semester-by-semester, no
                  stress.
                </p>
              </FadeUp>

              <FadeUp delay={0.35}>
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => router.push("/sign-in")}
                    className="group inline-flex items-center gap-4"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/18 transition duration-500 group-hover:scale-105 group-hover:bg-white">
                      <ArrowRight className="h-5 w-5 text-white/75 transition duration-500 group-hover:text-black" />
                    </span>
                    <span className="text-xs uppercase tracking-[0.18em] text-white transition duration-500 group-hover:text-white">
                      Get Started
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      document
                        .getElementById("process")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="rounded-full border border-white/[0.12] px-5 py-3 text-xs uppercase tracking-[0.18em] text-white transition hover:border-white/[0.25] hover:text-white"
                  >
                    Explore
                  </button>
                </div>
              </FadeUp>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="border-b border-white/[0.18] py-6">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 md:px-10">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            className="flex w-max gap-8"
          >
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                {item}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-5xl">
            <RevealLine>
              <p className="text-3xl font-semibold leading-[1.08] tracking-[-0.05em] text-white md:text-5xl lg:text-6xl">
                The smarter way to plan university.
              </p>
            </RevealLine>
            <RevealLine delay={0.08}>
              <p className="mt-2 text-3xl font-semibold leading-[1.08] tracking-[-0.05em] text-white md:text-5xl lg:text-6xl">
                Built for students who are done with handbook chaos.
              </p>
            </RevealLine>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.18] px-6 md:px-10">
        <div className="mx-auto max-w-7xl py-[4.5rem] md:py-24">
          <FadeUp>
            <div className="mb-12 text-xs uppercase tracking-[0.3em] text-white">
              Capabilities
            </div>
          </FadeUp>

          {capabilities.map(({ num, title, desc, icon: Icon }, i) => (
            <FadeUp key={num} delay={i * 0.04}>
              <div className="group grid grid-cols-12 items-start gap-6 border-t border-white/[0.18] py-10 md:py-14">
                <div className="col-span-2 md:col-span-1">
                  <span className="text-xs tracking-[0.18em] text-white">
                    {num}
                  </span>
                </div>

                <div className="col-span-10 md:col-span-4">
                  <div className="flex items-center gap-4">
                    <Icon className="h-4 w-4 flex-shrink-0 text-white transition group-hover:text-white" />
                    <h3 className="text-lg font-medium tracking-tight text-white transition group-hover:text-white md:text-xl">
                      {title}
                    </h3>
                  </div>
                </div>

                <div className="col-span-10 col-start-3 md:col-span-5 md:col-start-7">
                  <p className="text-sm leading-7 text-white transition group-hover:text-white md:text-base">
                    {desc}
                  </p>
                </div>

                <div className="hidden md:flex md:col-span-2 md:justify-end">
                  <ArrowUpRight className="h-4 w-4 translate-y-1 text-white/0 transition duration-500 group-hover:translate-y-0 group-hover:text-white/38" />
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <section id="process" className="bg-white px-6 text-black md:px-10">
        <div className="mx-auto max-w-7xl py-28 md:py-36">
          <div className="mb-20 grid gap-12 md:grid-cols-2 md:items-end">
            <div>
              <FadeUp>
                <div className="mb-5 text-xs uppercase tracking-[0.3em] text-black/60">
                  Process
                </div>
              </FadeUp>
              <RevealLine>
                <h2 className="text-5xl font-semibold leading-[0.92] tracking-[-0.06em] md:text-7xl">
                  Three steps.
                </h2>
              </RevealLine>
              <RevealLine delay={0.08}>
                <h2 className="text-5xl font-semibold leading-[0.92] tracking-[-0.06em] text-black/32 md:text-7xl">
                  That&apos;s it.
                </h2>
              </RevealLine>
            </div>

            <FadeUp delay={0.18}>
              <p className="max-w-sm text-base leading-8 text-black/58">
                No handbook rabbit holes. No course-planning spreadsheet
                nightmares. Just a cleaner path from confusion to clarity.
              </p>
            </FadeUp>
          </div>

          {steps.map(({ num, title, desc, icon: Icon }, i) => (
            <FadeUp key={num} delay={i * 0.06}>
              <div className="grid grid-cols-12 gap-8 border-t border-black/[0.07] py-12 md:py-16">
                <div className="col-span-3 md:col-span-2">
                  <span className="text-6xl font-semibold tracking-[-0.08em] text-black/[0.08] md:text-8xl">
                    {num}
                  </span>
                </div>

                <div className="col-span-9 md:col-span-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-black/38" />
                    <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                      {title}
                    </h3>
                  </div>
                </div>

                <div className="col-span-9 col-start-4 md:col-span-5 md:col-start-7">
                  <p className="text-sm leading-8 text-black/58 md:text-base">
                    {desc}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[0.18] bg-black px-6 md:px-10">
        <div className="mx-auto max-w-7xl py-28 md:py-36">
          <StaggerGrid className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {[
              { value: "2.4k+", label: "Plans Generated" },
              { value: "12", label: "Universities" },
              { value: "<30s", label: "Avg Plan Time" },
              { value: "4.9", label: "Student Rating" },
            ].map((stat) => (
              <StaggerItem key={stat.label}>
                <div>
                  <div className="text-5xl font-semibold tracking-[-0.08em] text-white md:text-7xl lg:text-8xl">
                    {stat.value}
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.2em] text-white">
                    {stat.label}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <section className="relative h-[70vh] overflow-hidden">
        <motion.img
          initial={{ scale: 1.12 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          src="https://images.unsplash.com/photo-1704748082614-8163a88e56b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudHMlMjBzdHVkeWluZyUyMGxhcHRvcHxlbnwxfHx8fDE3NzMzOTAzNjR8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Students studying"
          className="h-full w-full object-cover grayscale"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <FadeUp>
            <p className="max-w-3xl text-center text-2xl font-medium leading-snug tracking-tight text-white md:text-4xl">
              “We spent more time reading the handbook than actually studying.”
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="border-t border-white/[0.18] bg-black px-6 md:px-10">
        <div className="mx-auto max-w-7xl py-28 md:py-36">
          <div className="mb-20 grid gap-12 md:grid-cols-2 md:items-end">
            <div>
              <FadeUp>
                <div className="mb-5 text-xs uppercase tracking-[0.3em] text-white">
                  Reviews
                </div>
              </FadeUp>
              <RevealLine>
                <h2 className="text-4xl font-semibold leading-[0.95] tracking-[-0.06em] text-white md:text-6xl">
                  Don&apos;t take
                </h2>
              </RevealLine>
              <RevealLine delay={0.08}>
                <h2 className="text-4xl font-semibold leading-[0.95] tracking-[-0.06em] text-white md:text-6xl">
                  our word for it.
                </h2>
              </RevealLine>
            </div>

            <FadeUp delay={0.18}>
              <p className="max-w-xs text-sm leading-7 text-white md:justify-self-end md:text-right">
                Real students. Real plans. Real relief.
              </p>
            </FadeUp>
          </div>

          <StaggerGrid className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, i) => (
              <StaggerItem key={i}>
                <div className="flex h-full flex-col rounded-3xl border border-white/[0.18] bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/[0.28] hover:bg-white/[0.045]">
                  <Quote className="mb-4 h-5 w-5 text-white/[0.18]" />

                  <p className="mb-6 flex-1 text-sm leading-7 text-white">
                    &quot;{review.text}&quot;
                  </p>

                  <div className="flex items-center justify-between border-t border-white/[0.18] pt-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {review.name}
                      </div>
                      <div className="text-xs text-white">
                        {review.course}
                      </div>
                    </div>

                    <div className="flex gap-0.5">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star
                          key={j}
                          className="h-3 w-3 fill-white/55 text-white/55"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <section className="border-t border-white/[0.18] bg-black px-6 md:px-10">
        <div className="mx-auto max-w-7xl py-28 md:py-36">
          <div className="mb-16">
            <FadeUp>
              <div className="mb-5 text-xs uppercase tracking-[0.3em] text-white">
                About
              </div>
            </FadeUp>
            <RevealLine>
              <h2 className="text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-white md:text-7xl">
                Built by students,
              </h2>
            </RevealLine>
            <RevealLine delay={0.08}>
              <h2 className="text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-white md:text-7xl">
                for students.
              </h2>
            </RevealLine>
          </div>

          <div className="mb-20 grid gap-4 md:grid-cols-12">
            <FadeUp className="md:col-span-8">
              <div className="overflow-hidden rounded-3xl">
                <motion.img
                  initial={{ scale: 1.08 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
                  alt="Team"
                  className="h-[420px] w-full object-cover grayscale opacity-72 transition duration-700 hover:opacity-90 hover:grayscale-0 md:h-[520px]"
                />
              </div>
            </FadeUp>

            <FadeUp delay={0.12} className="md:col-span-4">
              <div className="overflow-hidden rounded-3xl">
                <motion.img
                  initial={{ scale: 1.08 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
                  src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80"
                  alt="Planning"
                  className="h-[420px] w-full object-cover grayscale opacity-72 transition duration-700 hover:opacity-90 hover:grayscale-0 md:h-[520px]"
                />
              </div>
            </FadeUp>
          </div>

          <div className="grid gap-16 md:grid-cols-2">
            <FadeUp>
              <div className="space-y-6 text-base leading-8 text-white md:text-lg">
                <p>
                  We got tired of spending hours cross-referencing handbooks,
                  prerequisite chains, and course maps just to figure out what
                  to enrol in next semester.
                </p>

                <p>
                  So we built U-NIT ME — an AI-powered tool that does all of
                  that in seconds. No more guesswork, no more anxiety.
                </p>

                <p>
                  We&apos;re a small team of uni students who believe course
                  planning shouldn&apos;t require a PhD in spreadsheet
                  management.
                </p>

                <div className="flex items-center gap-8 border-t border-white/[0.18] pt-6 md:gap-12">
                  <div>
                    <div className="text-4xl font-semibold tracking-[-0.06em] text-white">
                      2026
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white">
                      Founded
                    </div>
                  </div>

                  <div className="h-12 w-px bg-white/[0.08]" />

                  <div>
                    <div className="text-4xl font-semibold tracking-[-0.06em] text-white">
                      6
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white">
                      Team
                    </div>
                  </div>

                  <div className="h-12 w-px bg-white/[0.08]" />

                  <div>
                    <div className="text-4xl font-semibold tracking-[-0.06em] text-white">
                      ∞
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white">
                      Rage
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            <StaggerGrid className="grid grid-cols-2 gap-5">
              {valueCards.map(({ title, description, icon: Icon }) => (
                <StaggerItem key={title}>
                  <div className="rounded-3xl border border-white/[0.18] bg-white/[0.03] p-6 text-center transition hover:-translate-y-1 hover:border-white/[0.28] hover:bg-white/[0.045]">
                    <Icon className="mx-auto mb-4 h-6 w-6 text-white" />
                    <div className="text-lg font-semibold text-white">
                      {title}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white">
                      {description}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGrid>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.18] bg-black px-6 md:px-10">
        <div className="mx-auto max-w-5xl py-28 md:py-36">
          <div className="mb-14">
            <FadeUp>
              <div className="mb-5 text-xs uppercase tracking-[0.3em] text-white">
                FAQ
              </div>
            </FadeUp>
            <RevealLine>
              <h2 className="text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-white md:text-7xl">
                Yeah but...
              </h2>
            </RevealLine>
          </div>

          <div>
            {faqs.map((faq, i) => (
              <FaqItem
                key={i}
                faq={faq}
                index={i}
                openIndex={openFaq}
                setOpenIndex={setOpenFaq}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/[0.18] bg-black px-6 md:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_100%,rgba(255,255,255,0.06),transparent)]" />

        <div className="relative mx-auto max-w-6xl py-36 text-center md:py-52">
          <HeroRevealLine>
            <h2 className="text-6xl font-semibold leading-[0.9] tracking-[-0.08em] text-white md:text-8xl lg:text-9xl">
              Ready?
            </h2>
          </HeroRevealLine>

          <FadeUp delay={0.2}>
            <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-white md:text-base">
              Join students who want a faster, cleaner, and less painful way to
              think about their degree.
            </p>
          </FadeUp>

          <FadeUp delay={0.32}>
            <button
              onClick={() => router.push("/sign-in")}
              className="group mt-12 inline-flex items-center gap-4"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/18 transition duration-500 group-hover:scale-105 group-hover:bg-white">
                <ArrowRight className="h-5 w-5 text-white/75 transition duration-500 group-hover:text-black" />
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-white transition duration-500 group-hover:text-white">
                Plan My Degree
              </span>
            </button>
          </FadeUp>
        </div>
      </section>

      <footer className="border-t border-white/[0.18] px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-white/24 text-[8px] text-white/60">
              U
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-white">
              U-NIT ME
            </span>
          </div>

          <span className="text-[10px] uppercase tracking-[0.18em] text-white">
            © 2026 — All rights reserved
          </span>
        </div>
      </footer>
    </main>
  );
}
