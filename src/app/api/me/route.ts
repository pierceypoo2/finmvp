import { NextResponse } from "next/server";
import { clerkConfigured } from "@/lib/getUser";

export async function GET() {
  if (!clerkConfigured) {
    return NextResponse.json({ email: null });
  }

  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();
    const email =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      null;
    return NextResponse.json({ email });
  } catch {
    return NextResponse.json({ email: null });
  }
}

