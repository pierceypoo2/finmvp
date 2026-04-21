import { requireUserId } from "@/lib/getUser";
import { getPlaidClient } from "@/lib/plaid";
import { rateLimit } from "@/lib/rateLimit";
import { allPlaidItems, bundleWithItems } from "@/lib/plaidBundle";
import { getPlaidBundle, setPlaidBundle } from "@/lib/tokenStore";
import { auditLog } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`unlink:${userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await req.json();
  const accountId = body.accountId as string | undefined;
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const bundle = getPlaidBundle(userId);
  if (!bundle || !allPlaidItems(bundle).length) {
    return NextResponse.json({ error: "No linked accounts" }, { status: 404 });
  }

  const plaid = getPlaidClient();

  async function accountBelongsToToken(accessToken: string): Promise<boolean> {
    try {
      const { data } = await plaid.accountsGet({ access_token: accessToken });
      return data.accounts.some((a) => a.account_id === accountId);
    } catch {
      return false;
    }
  }

  try {
    const slots = allPlaidItems(bundle);
    let removedAccountIds: string[] = [];
    let matchedSlot: (typeof slots)[number] | null = null;

    for (const slot of slots) {
      if (await accountBelongsToToken(slot.access_token)) {
        matchedSlot = slot;
        try {
          const { data } = await plaid.accountsGet({ access_token: slot.access_token });
          removedAccountIds = data.accounts.map((a) => a.account_id);
        } catch {
          removedAccountIds = accountId ? [accountId] : [];
        }
        try {
          await plaid.itemRemove({ access_token: slot.access_token });
        } catch {
          /* sandbox may fail; still drop token locally so the app never reuses it */
        }
        break;
      }
    }
    if (!matchedSlot) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const remaining = slots.filter((s) => s.item_id !== matchedSlot.item_id);
    setPlaidBundle(userId, bundleWithItems(remaining));

    auditLog({ userId, action: "plaid_unlink", accountId, ts: new Date().toISOString() });

    return NextResponse.json({ ok: true, removedAccountIds });
  } catch (e) {
    console.error("unlink error:", e);
    return NextResponse.json({ error: "unlink_failed" }, { status: 500 });
  }
}
