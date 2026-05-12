import { SignIn } from "@clerk/nextjs";

export default async function Page() {
  return (
    <SignIn
      forceRedirectUrl="/post-sign-in"
      fallbackRedirectUrl="/post-sign-in"
    />
  );
}
