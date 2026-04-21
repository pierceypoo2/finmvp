import { requireUserId } from "@/lib/getUser";
import { getPlaidClient } from "@/lib/plaid";
import { rateLimit } from "@/lib/rateLimit";
import { allPlaidItems } from "@/lib/plaidBundle";
import { getPlaidBundle } from "@/lib/tokenStore";
import type { LinkedAccount } from "@/lib/types";
import { NextResponse } from "next/server";

async function loadAccounts(accessToken: string): Promise<LinkedAccount[]> {
  const plaid = getPlaidClient();
  const { data } = await plaid.accountsGet({ access_token: accessToken });
  return data.accounts.map((a) => ({
    id: a.account_id,
    name: a.name,
    type: a.type,
    subtype: a.subtype ?? null,
    mask: a.mask ?? null,
    balance: a.balances.current ?? a.balances.available ?? null,
  }));
}

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`accounts:${userId}`, 15, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const bundle = getPlaidBundle(userId);
  const items = allPlaidItems(bundle);
  if (!items.length) {
    return NextResponse.json({ accounts: [] as LinkedAccount[] });
  }

  try {
    const all: LinkedAccount[] = [];
    for (const slot of items) {
      try {
        all.push(...(await loadAccounts(slot.access_token)));
      } catch (e) {
        console.warn("[accounts] skip item", slot.item_id, (e as Error)?.message ?? e);
      }
    }

    const unique = new Map<string, LinkedAccount>();
    for (const a of all) unique.set(a.id, a);

    return NextResponse.json({ accounts: [...unique.values()] });
  } catch (e) {
    console.error("accounts error:", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
