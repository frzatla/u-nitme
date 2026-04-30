import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!isAdminUser(user)) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f5f4ef] px-6 py-10 text-black md:px-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <UserButton />
      </div>

      <div className="mx-auto mt-10 max-w-5xl rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <p className="text-sm uppercase tracking-[0.24em] text-black/35">
          Welcome
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
          Welcome admin
        </h2>
      </div>
    </main>
  );
}
