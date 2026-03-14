import { createProfile, getProfileByEmail } from "@/lib/profile";
import { SignIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export default async function Page() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (email) {
    try {
      const existing = await getProfileByEmail(email);
      if (!existing) {
        await createProfile({
          email,
          plan: {
            university: "",
            faculty: "",
            degree: "",
            specialisation: "",
            major: "",
            minor: "",
            semesterOffering: "",
            yearStart: "",
            yearEnd: "",
          },
        });
      }
    } catch {
      // profile doesn't exist yet, already handled by createProfile
    }
  }

  return (
    <SignIn
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
