import { EFFICIENT_APR_PCT, PILLAR3_GATE_APR_PCT } from "@/lib/pillar3Gate";
import type { DebtRow } from "@/lib/types";

function hasApr(d: DebtRow): boolean {
  return d.apr != null && Number.isFinite(d.apr);
}

function annualInterestCost(d: DebtRow): number {
  if (!hasApr(d)) return 0;
  return (d.balance * d.apr!) / 100;
}

/**
 * Payoff order: **avalanche** — higher APR first (most expensive debt per dollar).
 * Ties: larger annual interest cost, then larger balance. Debts with unknown APR sort last.
 */
export function rankDebtsByPriority(debts: DebtRow[]): DebtRow[] {
  return [...debts].sort((a, b) => {
    const aKnown = hasApr(a);
    const bKnown = hasApr(b);
    if (aKnown && !bKnown) return -1;
    if (!aKnown && bKnown) return 1;
    if (!aKnown && !bKnown) return b.balance - a.balance;

    const aprA = a.apr!;
    const aprB = b.apr!;
    if (aprB !== aprA) return aprB - aprA;

    const costA = annualInterestCost(a);
    const costB = annualInterestCost(b);
    if (costB !== costA) return costB - costA;

    return b.balance - a.balance;
  });
}

/**
 * Badge severity for the debt list — **APR-first**, aligned with the Pillar 3 gate (10%) and efficient band (6%).
 * Avoids calling a huge low-rate mortgage “high stress” just because balance is large.
 */
export function debtPriorityLabel(d: DebtRow): "high" | "medium" | "low" {
  if (!hasApr(d)) return "medium";
  const apr = d.apr!;
  if (apr > PILLAR3_GATE_APR_PCT) return "high";
  if (apr > EFFICIENT_APR_PCT) return "medium";
  return "low";
}
