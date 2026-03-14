import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import StudentDetailsForm from "../../components/StudentDetailsForm";
import { redirect } from "next/navigation";
import { updateProfile } from "@/lib/profile";

export default async function DashboardPage() {
  const user = await currentUser();

  async function handleSubmit(formData: FormData) {
    "use server";
    const selectedDegree = String(formData.get("degree") || "");

    const data = {
      university: String(formData.get("university") || ""),
      faculty: String(formData.get("faculty") || ""),
      degree: selectedDegree,
      specialisation:
        selectedDegree === "COMPSCI"
          ? String(formData.get("specialisation") || "")
          : null,
      major:
        selectedDegree === "IT" ? String(formData.get("major") || "") : null,
      minor:
        selectedDegree === "IT" ? String(formData.get("minor") || "") : null,
      yearStart: Number(formData.get("yearStart")),
      yearEnd: Number(formData.get("yearEnd")),
    };

    console.log("form submit data:", data);

    try {
      const email = user?.primaryEmailAddress?.emailAddress;

      const plan = {
        plan: { ...data },
      };

      const postData = await updateProfile(email, plan);

      console.log("POST result:", postData);

      // Redirect if needed
      redirect("/course-plan");
    } catch (error) {
      console.error(error.message);
    }
  }

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

          <UserButton />
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

          <StudentDetailsForm action={handleSubmit} />
        </div>
      </section>
    </main>
  );
}
function getProfileByEmail(email: string) {
  throw new Error("Function not implemented.");
}
