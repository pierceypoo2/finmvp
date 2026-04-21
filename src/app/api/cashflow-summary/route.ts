import { autoCategorizeAll } from "@/lib/autoCategory";
import { isCashInInflow } from "@/lib/cashflow";
import { attachDebtPaymentSuggestions } from "@/lib/debtPaymentAmountMatch";
import { toLocalDateString } from "@/lib/dateLocal";
import { loadAllDebtsForPlaidItems } from "@/lib/plaidLiabilities";
import { allPlaidItems } from "@/lib/plaidBundle";
import { getPlaidTransactionsForItem } from "@/lib/plaidTransactions";
import { requireUserId } from "@/lib/getUser";
import { rateLimit } from "@/lib/rateLimit";
import { getPlaidBundle } from "@/lib/tokenStore";
import type { TxRow } from "@/lib/types";
import { NextResponse } from "next/server";

function fmt(d: Date) {
  return toLocalDateString(d);
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export type MonthBucket = {
  key: string;
  label: string;
  income: number;
  /** Living + discretionary (excludes debt). */
  spend: number;
  /** Loan / card payments (Plaid LOAN_PAYMENTS + user-tagged). */
  debtPayments: number;
  cashflow: number;
  txCount: number;
};

export type CashflowSummaryResponse = {
  months: MonthBucket[];
  avgIncome: number;
  /** Living + discretionary (no debt payments). */
  avgLivingSpend: number;
  /** Loan / card paydowns from categorized transactions. */
  avgDebtPayments: number;
  /** Same as avgLivingSpend + avgDebtPayments (total outflows). */
  avgSpend: number;
  avgCashflow: number;
  totalTxCount: number;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`cf-summary:${userId}`, 5, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const bundle = getPlaidBundle(userId);
  const items = allPlaidItems(bundle);
  if (!items.length) {
    return NextResponse.json({
      months: [],
      avgIncome: 0,
      avgLivingSpend: 0,
      avgDebtPayments: 0,
      avgSpend: 0,
      avgCashflow: 0,
      totalTxCount: 0,
    });
  }

  const end = new Date();
  const start = new Date();
  // Pull a long window so sandbox / sample Plaid data (often not in the last 6 calendar months) is included.
  start.setDate(start.getDate() - 730);
  const startDate = fmt(start);
  const endDate = fmt(end);

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

    const bucketMap = new Map<string, TxRow[]>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      bucketMap.set(key, []);
    }

    for (const tx of categorized) {
      const key = monthKey(tx.date);
      if (bucketMap.has(key)) {
        bucketMap.get(key)!.push(tx);
      }
    }

    const txsInFixedBuckets = [...bucketMap.values()].reduce((s, a) => s + a.length, 0);
    if (txsInFixedBuckets === 0 && categorized.length > 0) {
      bucketMap.clear();
      const byMonth = new Map<string, TxRow[]>();
      for (const tx of categorized) {
        const k = monthKey(tx.date);
        if (!byMonth.has(k)) byMonth.set(k, []);
        byMonth.get(k)!.push(tx);
      }
      const keys = [...byMonth.keys()].sort((a, b) => b.localeCompare(a)).slice(0, 6);
      for (const k of keys) {
        bucketMap.set(k, byMonth.get(k)!);
      }
    }

    const months: MonthBucket[] = [];
    let totalTxCount = 0;
    for (const [key, txs] of bucketMap) {
      const [y, m] = key.split("-").map(Number);
      let income = 0;
      let spend = 0;
      let debtPayments = 0;
      for (const t of txs) {
        if (isCashInInflow(t)) {
          income += Math.abs(t.amount);
        } else if (t.amount > 0 && t.category === "debt_payment") {
          debtPayments += t.amount;
        } else if (t.amount > 0 && t.category !== "transfer") {
          spend += t.amount;
        }
      }
      income = Math.round(income * 100) / 100;
      spend = Math.round(spend * 100) / 100;
      debtPayments = Math.round(debtPayments * 100) / 100;
      const outflows = Math.round((spend + debtPayments) * 100) / 100;
      totalTxCount += txs.length;
      months.push({
        key,
        label: `${MONTH_NAMES[m - 1]} ${y}`,
        income,
        spend,
        debtPayments,
        cashflow: Math.round((income - outflows) * 100) / 100,
        txCount: txs.length,
      });
    }

    months.sort((a, b) => b.key.localeCompare(a.key));

    // Average across all 6 months (including $0 months — real data)
    const count = months.length || 1;
    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalLiving = months.reduce((s, m) => s + m.spend, 0);
    const totalDebt = months.reduce((s, m) => s + m.debtPayments, 0);
    const totalOutflows = totalLiving + totalDebt;
    const totalCF = months.reduce((s, m) => s + m.cashflow, 0);

    return NextResponse.json({
      months,
      avgIncome: Math.round(totalIncome / count),
      avgLivingSpend: Math.round(totalLiving / count),
      avgDebtPayments: Math.round(totalDebt / count),
      avgSpend: Math.round(totalOutflows / count),
      avgCashflow: Math.round(totalCF / count),
      totalTxCount,
    } satisfies CashflowSummaryResponse);
  } catch (e) {
    console.error("cashflow-summary error:", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
