import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth";
import {
  buildCoursePlanInfoPills,
  getCoursePlanById,
} from "@/lib/coursePlan";
import CoursePlanPdfDocument from "@/components/CoursePlanPdfDocument";

export default async function CoursePlanPdfPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ pending?: string }>;
}) {
  const { planId } = await params;
  const { pending } = await searchParams;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) redirect("/sign-in");
  if (isAdminUser(user)) redirect("/admin");

  const plan = await getCoursePlanById(email, planId, pending === "true");

  if (!plan || !plan.schedule) {
    redirect("/profile");
  }

  const infoPills = buildCoursePlanInfoPills(plan);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            'window.addEventListener("load", () => { window.print(); }, { once: true });',
        }}
      />
      <CoursePlanPdfDocument plan={plan} infoPills={infoPills} />
    </>
  );
}
