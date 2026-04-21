import type { DebtRow } from "@/lib/types";
import { cashFlowIndexForDebt } from "@/lib/cfi";
import { simulateMonthsToPayoff } from "@/lib/debtPayoff";

function hasApr(d: DebtRow): boolean {
  return d.apr != null && Number.isFinite(d.apr);
}

function annualInterestCost(d: DebtRow): number {
  if (!hasApr(d)) return 0;
  return (d.balance * d.apr!) / 100;
}

function monthsAtMinPayment(d: DebtRow): number {
  const mp = Math.max(d.minPayment, 1);
  const sim = simulateMonthsToPayoff(d.balance, d.apr, mp);
  if (!sim.ok) return 999;
  return Math.max(1, sim.months);
}

/**
 * Hybrid priority score (higher = pay off first). Optional alternative to strict CFI ordering;
 * see {@link rankDebtsByCashFlowIndexOrder}.
 */
export function hybridPayoffPriorityScore(d: DebtRow, totalMinAcrossDebts: number): number {
  const apr = hasApr(d) ? d.apr! : 0;
  const annual = annualInterestCost(d);
  const mp = Math.max(d.minPayment, 0);
  const months = monthsAtMinPayment(d);

  const aprCore = apr * 3.25;

  const leak = Math.min(14, Math.log10(Math.max(annual, 0) + 1) * 4.5);

  const horizonBoost = months >= 999 ? 0 : Math.min(12, 24 / Math.sqrt(Math.max(1, months)));

  const reliefBoost =
    totalMinAcrossDebts > 0 && mp > 0
      ? Math.min(8, (mp / totalMinAcrossDebts) * 22)
      : 0;

  return aprCore + leak + horizonBoost + reliefBoost;
}

/** @deprecated Prefer {@link hybridPayoffPriorityScore}. */
export function cashflowPayoffPriorityScore(d: DebtRow, totalMinAcrossDebts: number): number {
  return hybridPayoffPriorityScore(d, totalMinAcrossDebts);
}

/**
 * **Payoff priority:** ascending **Cash Flow Index** (balance ÷ minimum payment).
 * Lower CFI first — the tighter the debt is against monthly minimums, the earlier you attack it.
 * Debts with no valid minimum sort last.
 */
export function rankDebtsByCashFlowIndexOrder(debts: DebtRow[]): DebtRow[] {
  return [...debts].sort((a, b) => {
    const cfiA = cashFlowIndexForDebt(a);
    const cfiB = cashFlowIndexForDebt(b);
    if (cfiA !== cfiB) {
      if (cfiA === Number.POSITIVE_INFINITY) return 1;
      if (cfiB === Number.POSITIVE_INFINITY) return -1;
      return cfiA - cfiB;
    }
    if (a.balance !== b.balance) return a.balance - b.balance;
    return a.name.localeCompare(b.name);
  });
}

/** @alias {@link rankDebtsByCashFlowIndexOrder} */
export function rankDebtsByCashFlowIndex(debts: DebtRow[]): DebtRow[] {
  return rankDebtsByCashFlowIndexOrder(debts);
}

/**
 * APR-first hybrid (not CFI). Use when you explicitly want rate-led ordering.
 */
export function rankDebtsByHybridPriority(debts: DebtRow[]): DebtRow[] {
  const totalMin = debts.reduce((s, d) => s + Math.max(d.minPayment, 0), 0);
  return [...debts].sort((a, b) => {
    const aKnown = hasApr(a);
    const bKnown = hasApr(b);
    if (aKnown && !bKnown) return -1;
    if (!aKnown && bKnown) return 1;
    if (!aKnown && !bKnown) return b.balance - a.balance;

    const sa = hybridPayoffPriorityScore(a, totalMin);
    const sb = hybridPayoffPriorityScore(b, totalMin);
    if (sb !== sa) return sb - sa;

    const aprA = a.apr!;
    const aprB = b.apr!;
    if (aprB !== aprA) return aprB - aprA;

    const costA = annualInterestCost(a);
    const costB = annualInterestCost(b);
    if (costB !== costA) return costB - costA;

    return b.balance - a.balance;
  });
}
