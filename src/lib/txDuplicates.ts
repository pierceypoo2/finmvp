import type { TxRow } from "@/lib/types";

/** Day key YYYY-MM-DD from ISO date string. */
function dayKey(date: string): string {
  return date.slice(0, 10);
}

export function amountKey(amount: number): string {
  return Math.round(amount * 100).toString();
}

/**
 * Groups transactions that look like duplicate posts: same calendar day + same amount.
 * Does not require same merchant (bank often shows slightly different strings).
 */
export function groupDuplicatesByDayAndAmount(txs: TxRow[]): Map<string, TxRow[]> {
  const map = new Map<string, TxRow[]>();
  for (const t of txs) {
    const k = `${dayKey(t.date)}|${amountKey(t.amount)}`;
    const list = map.get(k);
    if (list) list.push(t);
    else map.set(k, [t]);
  }
  return map;
}

/** Number of uncategorized rows that sit in a duplicate cluster (size ≥ 2). */
export function uncategorizedInDuplicateClusters(txs: TxRow[]): number {
  const groups = groupDuplicatesByDayAndAmount(txs);
  let n = 0;
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    for (const t of g) {
      if (t.category === "uncategorized" && !t.debtPaymentSuggestion) n += 1;
    }
  }
  return n;
}
