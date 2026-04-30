import type { User } from "@clerk/nextjs/server";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;

  const role = user.publicMetadata?.role;
  if (role === "admin") return true;

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) return false;

  return getAdminEmails().includes(email);
}
