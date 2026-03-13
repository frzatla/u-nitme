"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import StudentDetailsForm from "../../components/StudentDetailsForm";

export default function DashboardPage() {
  const { user } = useUser();

  const handleSubmit = (data) => {
    console.log("Submitted data:", data);

    // later you can:
    // 1. save to your database
    // 2. call an API route
    // 3. redirect to generated plan page
  };

  return (
    <main className="min-h-screen bg-[#f5f5f4] text-black">
      {/* Header */}
      <header className="border-b border-black/10 bg-[#f5f5f4]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-semibold text-white">
              U
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tracking-tight">
                U-NIT ME
              </span>
              <span className="hidden text-sm text-black/30 sm:inline">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
          </div>

          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Content */}
      <section className="px-6 py-12 md:px-8 md:py-14">
        <div className="mx-auto max-w-3xl">
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
