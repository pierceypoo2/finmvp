import { auth } from "@clerk/nextjs/server";

export const clerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("PASTE");

const DEV_USER = "dev-user-local";

/** Returns the Clerk userId, or a dev fallback when Clerk isn't configured. */
export async function requireUserId(): Promise<string> {
  if (!clerkConfigured) return DEV_USER;

  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHORIZED");
  return userId;
}
