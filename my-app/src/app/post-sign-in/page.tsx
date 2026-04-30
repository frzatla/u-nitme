import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth";

export default async function PostSignInPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (isAdminUser(user)) {
    redirect("/admin");
  }

  redirect("/dashboard");
}
