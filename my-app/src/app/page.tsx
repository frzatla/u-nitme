import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0b0a] text-[#f3efe7]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(241,197,95,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_32%)]" />

      <header className="relative z-10">
        <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-6 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <Image
                src="/U-NIT ME-2.png"
                alt="U-NIT ME logo"
                fill
                sizes="44px"
                className="object-contain"
                priority
              />
            </span>
            <span className="text-xs uppercase tracking-[0.28em] text-[#f3efe7]/72">
              U-NIT ME
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/about"
              className="rounded-full border border-white/12 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#f3efe7]/70 transition hover:border-white/25 hover:text-[#f3efe7]"
            >
              About
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-full bg-[#f3efe7] px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-black transition hover:bg-white"
            >
              Sign In
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center px-6 pb-16 pt-8 md:px-10">
        <div className="w-full">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#f3efe7]/42">
            Monash Course Planning
          </p>

          <h1 className="mt-6 max-w-4xl text-[clamp(3.5rem,10vw,7.5rem)] font-semibold leading-[0.88] tracking-[-0.09em] text-[#f3efe7]">
            Your degree plan,
            <br />
            without the mess.
          </h1>

          <p className="mt-8 max-w-xl text-base leading-8 text-[#f3efe7]/62 md:text-lg">
            AI-generated semester mapping for students who want clarity fast.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-full bg-[#f3efe7] px-6 py-3 text-sm font-medium text-black transition hover:bg-white"
            >
              Start Planning
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-white/12 px-6 py-3 text-sm text-[#f3efe7]/72 transition hover:border-white/25 hover:text-[#f3efe7]"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
