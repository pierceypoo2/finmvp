import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/getUser";
import { addToWaitlist, type WaitlistFeature } from "@/lib/waitlistStore";

function normalizeFeature(v: unknown): WaitlistFeature {
  if (v === "risk") return "risk";
  if (v === "wealth") return "wealth";
  return "unknown";
}

export async function POST(req: Request) {
  const userId = await requireUserId();

  const body = (await req.json().catch(() => null)) as { feature?: unknown; email?: unknown } | null;
  const feature = normalizeFeature(body?.feature);
  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const email = emailRaw.trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "MISSING_EMAIL" }, { status: 400 });
  }

  const result = addToWaitlist({ feature, email, userId });
  return NextResponse.json({ ok: true, already: result.already });
}

