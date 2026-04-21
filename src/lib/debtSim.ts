import type { DebtRow } from "@/lib/types";
import { simulateMonthsToPayoff } from "@/lib/debtPayoff";

export type DebtWithSimMonths = {
  debt: DebtRow;
  months: number;
  /** Infinity if never pays off at this payment */
  sortKey: number;
};

export type PortfolioPayoffResult =
  | { ok: true; months: number; totalInterest: number }
  | { ok: false; reason: "insufficient_budget" | "invalid" };

/** Order by who reaches $0 first at given monthly payments (shortest horizon first). */
export function simulatedPayoffOrder(
  debts: DebtRow[],
  paymentByDebt: Record<string, number>,
): DebtRow[] {
  const rows: DebtWithSimMonths[] = debts.map((d) => {
    const pmt =
      paymentByDebt[d.id] ??
      Math.max(d.minPayment, 1);
    const r = simulateMonthsToPayoff(d.balance, d.apr, pmt);
    const months = r.ok ? r.months : Number.POSITIVE_INFINITY;
    return { debt: d, months, sortKey: months };
  });

  return rows
    .sort((a, b) => {
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
      return b.debt.balance - a.debt.balance;
    })
    .map((r) => r.debt);
}

/**
 * Month-by-month portfolio simulation with payment "rollover".
 *
 * - Pay each debt its minimum (or as much as needed to finish it).
 * - Allocate remaining budget to the current target in `order` (first not yet paid).
 * - When a debt is paid off, its freed payment capacity rolls to the next debt.
 *
 * This answers “how many months until I’m debt-free?” given the same total monthly budget,
 * and lets us compare different payoff orders (e.g. current vs avalanche).
 */
export function simulatePortfolioPayoff(
  debts: DebtRow[],
  monthlyBudgetTotal: number,
  order: DebtRow[],
  asOf: Date = new Date(),
): PortfolioPayoffResult {
  if (!Number.isFinite(monthlyBudgetTotal) || monthlyBudgetTotal <= 0) return { ok: false, reason: "invalid" };
  if (debts.length === 0) return { ok: true, months: 0, totalInterest: 0 };

  const MAX_MONTHS = 1200;
  const b: Record<string, number> = {};
  const r: Record<string, number> = {};
  const minP: Record<string, number> = {};

  for (const d of debts) {
    b[d.id] = Math.max(0, d.balance);
    r[d.id] = ((d.apr ?? 0) / 100) / 12;
    minP[d.id] = Math.max(0, d.minPayment ?? 0);
  }

  const totalMin = debts.reduce((s, d) => s + Math.max(0, d.minPayment ?? 0), 0);
  if (monthlyBudgetTotal + 1e-8 < totalMin) return { ok: false, reason: "insufficient_budget" };

  let months = 0;
  let totalInterest = 0;

  function allPaid() {
    for (const d of debts) {
      if (b[d.id] > 0.02) return false;
    }
    return true;
  }

  function nextTargetId(): string | null {
    for (const d of order) {
      if (b[d.id] > 0.02) return d.id;
    }
    // If `order` omitted something, fall back to any remaining.
    for (const d of debts) {
      if (b[d.id] > 0.02) return d.id;
    }
    return null;
  }

  while (!allPaid() && months < MAX_MONTHS) {
    // 1) Interest accrues
    for (const d of debts) {
      const id = d.id;
      const bal = b[id];
      if (bal <= 0.02) continue;
      const interest = bal * r[id];
      totalInterest += interest;
      b[id] = bal + interest;
    }

    // 2) Pay minimums first (or remaining balance)
    let remainingBudget = monthlyBudgetTotal;
    for (const d of debts) {
      const id = d.id;
      const bal = b[id];
      if (bal <= 0.02) continue;
      const pay = Math.min(bal, Math.max(0, minP[id]));
      if (pay <= 0) continue;
      b[id] = bal - pay;
      remainingBudget -= pay;
    }

    if (remainingBudget < -1e-6) return { ok: false, reason: "invalid" };

    // 3) Allocate leftover to the priority target (avalanche / current order)
    let guard = 0;
    while (remainingBudget > 0.01 && guard < 1000) {
      guard++;
      const targetId = nextTargetId();
      if (!targetId) break;
      const bal = b[targetId];
      if (bal <= 0.02) continue;
      const pay = Math.min(bal, remainingBudget);
      b[targetId] = bal - pay;
      remainingBudget -= pay;
    }

    // 4) Validate we’re making progress (avoid infinite loops when mins are 0 and APR is 0 etc.)
    months++;
    void asOf; // keep signature stable; date output handled elsewhere
  }

  if (!allPaid()) {
    // Conservative: if we couldn't finish within cap, report invalid budget dynamics.
    // (Typically this would mean very high APR + barely above interest, or pathological inputs.)
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, months, totalInterest };
}
