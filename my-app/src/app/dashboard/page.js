"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import StudentDetailsForm from "../../components/StudentDetailsForm";

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();

  const handleSubmit = async (formData) => {
  try {
    const email = user?.primaryEmailAddress?.emailAddress;

    const payload = {
      email,
      university: formData.university,
      faculty: formData.faculty,
      degree: formData.degree,
      specialisation: formData.specialisation,
      major: formData.major,
      minor: formData.minor,
      yearStart: formData.yearStart,
      yearEnd: formData.yearEnd,
    };

    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Failed to save profile");
    }

    router.push("/course-plan");
    console.log("Saved profile:", result.data);
  } catch (error) {
    console.error(error.message);
  }
};

  return (
    <main className="min-h-screen bg-[#f5f5f4] text-black">
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