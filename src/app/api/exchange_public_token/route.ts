import { auditLog } from "@/lib/audit";
import { requireUserId } from "@/lib/getUser";
import { getPlaidClient } from "@/lib/plaid";
import { rateLimit } from "@/lib/rateLimit";
import { allPlaidItems, bundleWithItems } from "@/lib/plaidBundle";
import { getPlaidBundle, setPlaidBundle } from "@/lib/tokenStore";
import type { LinkPurpose } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`exchange:${userId}`, 5, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await req.json();
  const publicToken = body.public_token as string | undefined;
  const purpose = body.purpose as LinkPurpose | undefined;

  if (!publicToken || (purpose !== "credit" && purpose !== "bank" && purpose !== "loan")) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const plaid = getPlaidClient();
    const { data } = await plaid.itemPublicTokenExchange({ public_token: publicToken });
    const slot = { access_token: data.access_token, item_id: data.item_id };
    const merged = allPlaidItems(getPlaidBundle(userId));
    const withoutDup = merged.filter((s) => s.item_id !== slot.item_id);
    setPlaidBundle(userId, bundleWithItems([...withoutDup, slot]));

    auditLog({ userId, action: "plaid_exchange", purpose, ts: new Date().toISOString() });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("exchange error:", e);
    return NextResponse.json({ error: "exchange_failed" }, { status: 500 });
  }
}
