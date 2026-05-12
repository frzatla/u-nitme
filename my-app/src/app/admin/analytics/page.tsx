import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, Search } from "lucide-react";
import { isAdminUser } from "@/lib/auth";
import { getUnitAnalytics } from "@/lib/adminData";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminUser(user)) redirect("/dashboard");

  const { q } = await searchParams;
  const query = q?.trim().toUpperCase() ?? "";
  const analytics = getUnitAnalytics(query).slice(0, query ? 50 : 25);
  const totalCurrent = analytics.reduce(
    (sum, unit) => sum + unit.currentStudents,
    0,
  );
  const totalPrevious = analytics.reduce(
    (sum, unit) => sum + unit.previousStudents,
    0,
  );

  return (
    <main className="min-h-screen bg-[#f5f4ef] text-black">
      <header className="border-b border-black/10 bg-[#f5f4ef]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/55 transition hover:text-black"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-sm font-medium tracking-tight">Analytics</p>
              <p className="text-xs text-black/35">Unit enrolment counts</p>
            </div>
          </div>
          <UserButton />
        </div>
      </header>

      <section className="px-6 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-black/45">
                Admin Analytics
              </p>
              <h1 className="mt-3 text-5xl font-semibold tracking-[-0.07em] md:text-7xl">
                Unit Demand
              </h1>
            </div>

            <form className="flex w-full max-w-md items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <Search className="h-4 w-4 text-black/30" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search unit code, e.g. FIT1008"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-black/30"
              />
              <button
                type="submit"
                className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white"
              >
                Search
              </button>
            </form>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-black px-6 py-5 text-white">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                Units Shown
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-[-0.06em]">
                {analytics.length}
              </p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-white px-6 py-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-black/35">
                Current Enrolments
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-[-0.06em]">
                {totalCurrent}
              </p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-white px-6 py-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-black/35">
                Previous Enrolments
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-[-0.06em]">
                {totalPrevious}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between border-b border-black/8 px-6 py-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-black/35">
                  Unit Table
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                  {query ? `Results for ${query}` : "Top Current Units"}
                </h2>
              </div>
              <BarChart3 className="h-5 w-5 text-black/30" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-black/[0.03] text-[11px] uppercase tracking-[0.16em] text-black/35">
                  <tr>
                    <th className="px-6 py-4 font-medium">Unit</th>
                    <th className="px-6 py-4 font-medium">Title</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Current
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      Previous
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      Unique Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.length > 0 ? (
                    analytics.map((unit) => (
                      <tr key={unit.code} className="border-t border-black/6">
                        <td className="px-6 py-4 font-medium">{unit.code}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{unit.title}</p>
                          <p className="mt-1 text-xs text-black/35">
                            {unit.school || "No school listed"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right text-lg font-semibold">
                          {unit.currentStudents}
                        </td>
                        <td className="px-6 py-4 text-right text-black/55">
                          {unit.previousStudents}
                        </td>
                        <td className="px-6 py-4 text-right text-black/55">
                          {unit.totalUniqueStudents}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-16 text-center text-black/35"
                      >
                        No unit analytics found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
