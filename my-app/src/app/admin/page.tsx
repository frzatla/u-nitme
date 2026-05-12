import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Database,
  Plus,
} from "lucide-react";
import { isAdminUser } from "@/lib/auth";
import {
  addUnitToDataset,
  getRecentUnits,
  getUnitAnalytics,
} from "@/lib/adminData";

function fieldClass() {
  return "w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black outline-none transition focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/[0.03]";
}

async function addUnitAction(formData: FormData) {
  "use server";

  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminUser(user)) redirect("/dashboard");

  let addedCode = "";
  try {
    addedCode = addUnitToDataset({
      code: String(formData.get("code") || ""),
      title: String(formData.get("title") || ""),
      creditPoints: Number(formData.get("creditPoints") || 6),
      level: Number(formData.get("level") || 1),
      school: String(formData.get("school") || ""),
      academicOrg: String(formData.get("academicOrg") || ""),
      overview: String(formData.get("overview") || ""),
      period: String(formData.get("period") || ""),
      location: String(formData.get("location") || ""),
      mode: String(formData.get("mode") || ""),
      prerequisites: String(formData.get("prerequisites") || ""),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not add unit.";
    redirect(`/admin?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/analytics");
  redirect(`/admin?added=${encodeURIComponent(addedCode)}`);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; error?: string }>;
}) {
  const user = await currentUser();

  if (!user) redirect("/sign-in");
  if (!isAdminUser(user)) redirect("/dashboard");

  const { added, error } = await searchParams;
  const recentUnits = getRecentUnits(6);
  const topUnits = getUnitAnalytics().slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f5f4ef] text-black">
      <header className="border-b border-black/10 bg-[#f5f4ef]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium tracking-tight">U-NIT ME</p>
              <p className="text-xs text-black/35">Admin Home</p>
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
                Admin
              </p>
              <h1 className="mt-3 text-5xl font-semibold tracking-[-0.07em] md:text-7xl">
                Unit Management
              </h1>
            </div>

            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-black/20"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {added ? (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              {added} was added to the unit dataset.
            </div>
          ) : null}

          {error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <form
              action={addUnitAction}
              className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-8"
            >
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.03em]">
                    Add Unit
                  </h2>
                  <p className="text-sm text-black/40">
                    Saves into algo/src/data/mock_units.json.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Unit Code
                  </label>
                  <input
                    name="code"
                    placeholder="FIT3999"
                    required
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Title
                  </label>
                  <input
                    name="title"
                    placeholder="Advanced software studio"
                    required
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Credit Points
                  </label>
                  <input
                    name="creditPoints"
                    type="number"
                    min="1"
                    defaultValue="6"
                    required
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Level
                  </label>
                  <select name="level" defaultValue="1" className={fieldClass()}>
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                    <option value="5">Level 5</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    School
                  </label>
                  <input
                    name="school"
                    placeholder="Faculty of Information Technology"
                    required
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Academic Org
                  </label>
                  <input
                    name="academicOrg"
                    placeholder="Faculty of Information Technology"
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Offering Period
                  </label>
                  <select
                    name="period"
                    defaultValue="First semester"
                    className={fieldClass()}
                  >
                    <option value="First semester">First semester</option>
                    <option value="Second semester">Second semester</option>
                    <option value="Summer semester">Summer semester</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Location
                  </label>
                  <input
                    name="location"
                    placeholder="Clayton"
                    defaultValue="Clayton"
                    className={fieldClass()}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Mode
                </label>
                <input
                  name="mode"
                  placeholder="Teaching activities are on-campus (ON-CAMPUS)"
                  className={fieldClass()}
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Prerequisites
                </label>
                <textarea
                  name="prerequisites"
                  rows={3}
                  placeholder="One rule per line, e.g. FIT1045 or (FIT1045;FIT1053)&MAT1830"
                  className={fieldClass()}
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Overview
                </label>
                <textarea
                  name="overview"
                  rows={4}
                  placeholder="Short handbook-style unit summary"
                  className={fieldClass()}
                />
              </div>

              <button
                type="submit"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-black/85"
              >
                <Plus className="h-4 w-4" />
                Save Unit
              </button>
            </form>

            <div className="space-y-6">
              <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-black/35">
                      Analytics
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                      Current Top Units
                    </h2>
                  </div>
                  <BarChart3 className="h-5 w-5 text-black/30" />
                </div>

                <div className="mt-5 space-y-3">
                  {topUnits.map((unit) => (
                    <div
                      key={unit.code}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-black/[0.03] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{unit.code}</p>
                        <p className="line-clamp-1 text-xs text-black/40">
                          {unit.title}
                        </p>
                      </div>
                      <p className="text-xl font-semibold">
                        {unit.currentStudents}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-black/35">
                      Dataset
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                      Recent Units
                    </h2>
                  </div>
                  <BookOpen className="h-5 w-5 text-black/30" />
                </div>

                <div className="mt-5 space-y-3">
                  {recentUnits.map((unit) => (
                    <div
                      key={unit.code}
                      className="rounded-2xl border border-black/8 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{unit.code}</p>
                        <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-xs text-black/45">
                          L{unit.level} · {unit.creditPoints} CP
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-black/42">
                        {unit.title}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
