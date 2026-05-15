import { SignIn } from "@clerk/nextjs";

export default async function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4">
      <SignIn
        forceRedirectUrl="/post-sign-in"
        fallbackRedirectUrl="/post-sign-in"
      />
    </main>
  );
}
