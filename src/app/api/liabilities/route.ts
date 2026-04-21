import { loadAllDebtsForPlaidItems } from "@/lib/plaidLiabilities";
import { requireUserId } from "@/lib/getUser";
import { rateLimit } from "@/lib/rateLimit";
import { allPlaidItems } from "@/lib/plaidBundle";
import { getPlaidBundle } from "@/lib/tokenStore";
import { NextResponse } from "next/server";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`liabilities:${userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const bundle = getPlaidBundle(userId);
  const items = allPlaidItems(bundle);
  if (!items.length) {
    return NextResponse.json({ connected: false, debts: [] });
  }

  try {
    const debts = await loadAllDebtsForPlaidItems(items);
    return NextResponse.json({
      connected: true,
      debts,
    });
  } catch (e) {
    console.error("liabilities error:", e);
    return NextResponse.json({ connected: false, debts: [], error: "unavailable" });
  }
}
