"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import StudentDetailsForm from "../../../components/StudentDetailsForm";

export default function NewPlanPage() {
  const router = useRouter();

  const handleSubmit = (data) => {
    localStorage.setItem("studentDetails", JSON.stringify(data));
    localStorage.removeItem("currentPlanId");
    router.push("/course-plan");
  };

  return (
    <main className="min-h-screen bg-[#f5f5f4] text-black">
      <header className="border-b border-black/10 bg-[#f5f5f4]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="relative h-8 w-8 overflow-hidden rounded-lg"
            >
              <Image
                src="/U-NIT ME-3.png"
                alt="U-NIT ME logo"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </button>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tracking-tight">
                U-NIT ME
              </span>
              <span className="hidden text-sm text-black/30 sm:inline">
                Create New Plan
              </span>
            </div>
          </div>

          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <section className="px-6 py-12 md:px-8 md:py-14">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-black/45 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="mb-8">
            <h1 className="text-4xl font-semibold tracking-tight text-black">
              Your Details
            </h1>
            <p className="mt-2 text-base text-black/45">
              Fill in your information below and we&apos;ll generate a
              personalized course plan.
            </p>
          </div>

          <StudentDetailsForm onSubmit={handleSubmit} />
        </div>
      </section>
    </main>
  );
}
