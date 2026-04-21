import type { DebtRow } from "@/lib/types";
import { computeAutoPayoffInsight, servicerStudentPayoffSchedule } from "@/lib/debtPayoff";

/**
 * **Cash Flow Index (CFI)** = balance ÷ minimum monthly payment.
 *
 * Rough interpretation: “months of minimums” to cover the balance if interest were zero—lower values
 * mean the debt is **tighter against cashflow** per dollar of min payment, so **payoff priority is
 * lowest CFI first** (ascending order).
 */
export function cashFlowIndex(balance: number, minPayment: number): number {
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  if (!Number.isFinite(minPayment) || minPayment <= 0) return Number.POSITIVE_INFINITY;
  return Math.round((balance / minPayment) * 100) / 100;
}

/**
 * Monthly “cashflow weight” for CFI.
 *
 * **Student loans:** prefer the amortized payment from servicer payoff date (and APR), not Plaid’s $0 or noisy min.
 * Uses `expected_payoff_date` or `loan_status.end_date` when needed. Fallbacks: reported min, last payment,
 * payoff projection, heuristic.
 */
export function effectiveMinPaymentForCfi(d: DebtRow): number {
  const fromServicer = servicerStudentPayoffSchedule(d);
  if (fromServicer != null && fromServicer.impliedMonthlyPayment > 0) {
    return Math.round(fromServicer.impliedMonthlyPayment * 100) / 100;
  }

  if (Number.isFinite(d.minPayment) && d.minPayment > 0) return d.minPayment;

  if (d.loanType === "student" && d.studentLoanMeta?.lastPaymentAmount != null) {
    const lp = d.studentLoanMeta.lastPaymentAmount;
    if (Number.isFinite(lp) && lp > 0) return lp;
  }

  const insight = computeAutoPayoffInsight(d);
  if (
    insight.kind === "min_payment_projection" &&
    insight.impliedMonthlyPayment != null &&
    Number.isFinite(insight.impliedMonthlyPayment) &&
    insight.impliedMonthlyPayment > 0
  ) {
    return insight.impliedMonthlyPayment;
  }

  const b = d.balance;
  if (!Number.isFinite(b) || b <= 0) return Number.NaN;

  const apr = d.apr;
  const monthlyInt =
    apr != null && Number.isFinite(apr) && apr > 0 ? (b * apr) / 100 / 12 : 0;
  const imputed = Math.max(35, monthlyInt + b * 0.0025);
  return Math.round(imputed * 100) / 100;
}

/** Per-account CFI for sorting and display. Uses {@link effectiveMinPaymentForCfi} so $0 Plaid mins don’t break order. */
export function cashFlowIndexForDebt(d: DebtRow): number {
  const mp = effectiveMinPaymentForCfi(d);
  return cashFlowIndex(d.balance, mp);
}

export type CfiZone = "danger" | "caution" | "freedom";

/** &lt;50 danger · 50–100 caution · &gt;100 freedom (matches typical CFI coaching bands). */
export function cfiBand(cfi: number): CfiZone | null {
  if (!Number.isFinite(cfi) || cfi <= 0) return null;
  if (cfi === Number.POSITIVE_INFINITY) return null;
  if (cfi < 50) return "danger";
  if (cfi <= 100) return "caution";
  return "freedom";
}

export function cfiBandLabel(zone: CfiZone): string {
  switch (zone) {
    case "danger":
      return "Danger zone";
    case "caution":
      return "Caution zone";
    case "freedom":
      return "Freedom zone";
  }
}

export function formatCfiDisplay(cfi: number): string {
  if (cfi === Number.POSITIVE_INFINITY) return "—";
  if (!Number.isFinite(cfi) || cfi <= 0) return "—";
  return cfi.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
