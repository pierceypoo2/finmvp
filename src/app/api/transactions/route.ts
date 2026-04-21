import { autoCategorizeAll } from "@/lib/autoCategory";
import { attachDebtPaymentSuggestions } from "@/lib/debtPaymentAmountMatch";
import { requireUserId } from "@/lib/getUser";
import { toLocalDateString } from "@/lib/dateLocal";
import { loadAllDebtsForPlaidItems } from "@/lib/plaidLiabilities";
import { allPlaidItems } from "@/lib/plaidBundle";
import { getPlaidTransactionsForItem } from "@/lib/plaidTransactions";
import { rateLimit } from "@/lib/rateLimit";
import { getPlaidBundle } from "@/lib/tokenStore";
import type { TxRow } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

function fmt(d: Date) {
  return toLocalDateString(d);
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: fmt(start), end: fmt(end) };
}

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`transactions:${userId}`, 15, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const bundle = getPlaidBundle(userId);
  const items = allPlaidItems(bundle);
  if (!items.length) {
    return NextResponse.json({ transactions: [] as TxRow[] });
  }

  const params = req.nextUrl.searchParams;
  const yearParam = params.get("year");
  const monthParam = params.get("month");

  let startDate: string;
  let endDate: string;

  if (yearParam && monthParam) {
    const range = monthRange(Number(yearParam), Number(monthParam) - 1);
    startDate = range.start;
    endDate = range.end;
  } else {
    // Wide fetch so sandbox / historical Plaid sample data (often not in last 30 days) still loads;
    // the client applies a rolling 30-day window for "Now" metrics (see forCashflowWindow).
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 400);
    startDate = fmt(start);
    endDate = fmt(end);
  }

  try {
    const parts: TxRow[] = [];
    for (const slot of items) {
      parts.push(
        ...(await getPlaidTransactionsForItem(slot.access_token, "bank", startDate, endDate)),
      );
    }

    const unique = new Map<string, TxRow>();
    for (const t of parts) unique.set(t.id, t);

    const debts = await loadAllDebtsForPlaidItems(items);
    const categorized = attachDebtPaymentSuggestions(autoCategorizeAll([...unique.values()]), debts);
    return NextResponse.json({ transactions: categorized });
  } catch (e) {
    console.error("transactions error:", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
