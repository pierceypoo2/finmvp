/** Month-by-month amortization; APR as annual percent (e.g. 5.25). */

import type { DebtRow } from "@/lib/types";

export type PayoffResult =
  | { ok: true; months: number; payoffDate: Date }
  | { ok: false; reason: "payment_too_low" | "invalid" };

const MAX_MONTHS = 1200;

export function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function simulateMonthsToPayoff(
  balance: number,
  aprAnnualPct: number | undefined,
  monthlyPayment: number,
  asOf: Date = new Date(),
): PayoffResult {
  if (balance <= 0) return { ok: true, months: 0, payoffDate: asOf };
  if (monthlyPayment <= 0 || !Number.isFinite(monthlyPayment)) {
    return { ok: false, reason: "invalid" };
  }

  const apr = aprAnnualPct ?? 0;
  const monthlyRate = apr / 100 / 12;

  if (monthlyRate === 0) {
    const months = Math.ceil(balance / monthlyPayment);
    return { ok: true, months, payoffDate: addMonths(asOf, months) };
  }

  let b = balance;
  const firstInterest = b * monthlyRate;
  if (monthlyPayment <= firstInterest + 1e-8) {
    return { ok: false, reason: "payment_too_low" };
  }

  let months = 0;
  while (b > 0.02 && months < MAX_MONTHS) {
    const interest = b * monthlyRate;
    const principal = monthlyPayment - interest;
    if (principal <= 0) return { ok: false, reason: "payment_too_low" };
    b -= principal;
    months++;
  }

  return { ok: true, months, payoffDate: addMonths(asOf, months) };
}

/**
 * Standard NPER amortization formula for number of months remaining.
 *
 * Uses the closed-form NPER equation for a level-payment amortizing balance:
 * \( n = \\frac{\\ln(\\frac{pmt}{pmt - r \\cdot pv})}{\\ln(1+r)} \\)
 *
 * Returns a whole-month count (ceil) and a payoffDate. Falls back to the same
 * failure reasons as `simulateMonthsToPayoff` when payment can’t reduce principal.
 */
export function nperMonthsToPayoff(
  balance: number,
  aprAnnualPct: number | undefined,
  monthlyPayment: number,
  asOf: Date = new Date(),
): PayoffResult {
  if (balance <= 0) return { ok: true, months: 0, payoffDate: asOf };
  if (monthlyPayment <= 0 || !Number.isFinite(monthlyPayment)) return { ok: false, reason: "invalid" };

  const apr = aprAnnualPct ?? 0;
  const r = apr / 100 / 12;

  if (r === 0) {
    const months = Math.ceil(balance / monthlyPayment);
    return { ok: true, months, payoffDate: addMonths(asOf, months) };
  }

  const interestOnly = balance * r;
  if (monthlyPayment <= interestOnly + 1e-8) return { ok: false, reason: "payment_too_low" };

  const denom = Math.log(1 + r);
  if (!Number.isFinite(denom) || denom <= 0) return { ok: false, reason: "invalid" };

  const ratio = monthlyPayment / (monthlyPayment - r * balance);
  if (!Number.isFinite(ratio) || ratio <= 1) return { ok: false, reason: "invalid" };

  const n = Math.log(ratio) / denom;
  if (!Number.isFinite(n) || n < 0) return { ok: false, reason: "invalid" };

  const months = Math.min(MAX_MONTHS, Math.max(0, Math.ceil(n)));
  return { ok: true, months, payoffDate: addMonths(asOf, months) };
}

/**
 * Remaining balance at month 0..n for a fixed payment (same rules as {@link simulateMonthsToPayoff}).
 * Used for payoff timeline charts. Returns `[startBalance]` only if the payment can’t reduce principal.
 */
export function amortizationBalanceSchedule(
  balance: number,
  aprAnnualPct: number | undefined,
  monthlyPayment: number,
  maxMonths = 180,
): number[] {
  const out: number[] = [Math.max(0, balance)];
  if (balance <= 0) return out;
  if (monthlyPayment <= 0 || !Number.isFinite(monthlyPayment)) return out;

  const r = (aprAnnualPct ?? 0) / 100 / 12;
  let b = balance;

  if (r === 0) {
    let m = 0;
    while (b > 0.02 && m < maxMonths) {
      b -= monthlyPayment;
      m++;
      out.push(Math.max(0, b));
    }
    return out;
  }

  const firstInterest = b * r;
  if (monthlyPayment <= firstInterest + 1e-8) {
    return out;
  }

  let m = 0;
  while (b > 0.02 && m < maxMonths) {
    const interest = b * r;
    const principal = monthlyPayment - interest;
    if (principal <= 0) break;
    b -= principal;
    m++;
    out.push(Math.max(0, b));
  }
  return out;
}

/**
 * Cumulative interest charged through each month, aligned with {@link amortizationBalanceSchedule}
 * indices (month 0 = 0, then running total after each payment).
 */
export function amortizationCumulativeInterestSchedule(
  balance: number,
  aprAnnualPct: number | undefined,
  monthlyPayment: number,
  maxMonths = 180,
): number[] {
  const out: number[] = [0];
  if (balance <= 0) return out;
  if (monthlyPayment <= 0 || !Number.isFinite(monthlyPayment)) return out;

  const r = (aprAnnualPct ?? 0) / 100 / 12;
  let b = balance;
  let totalInterest = 0;

  if (r === 0) {
    let m = 0;
    while (b > 0.02 && m < maxMonths) {
      b -= monthlyPayment;
      m++;
      out.push(totalInterest);
    }
    return out;
  }

  const firstInterest = b * r;
  if (monthlyPayment <= firstInterest + 1e-8) {
    return out;
  }

  let m = 0;
  while (b > 0.02 && m < maxMonths) {
    const interest = b * r;
    const principal = monthlyPayment - interest;
    if (principal <= 0) break;
    totalInterest += interest;
    b -= principal;
    m++;
    out.push(totalInterest);
  }
  return out;
}

/** Cap points for SVG performance (keeps first and last). */
export function downsampleSchedule(balances: number[], maxPoints: number): number[] {
  if (balances.length <= maxPoints) return balances;
  const last = balances.length - 1;
  const out: number[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i / (maxPoints - 1)) * last);
    out.push(balances[Math.min(idx, last)]);
  }
  return out;
}

export function formatPayoffDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric", day: "numeric" });
}

export function formatMonthsLabel(months: number): string {
  if (months >= 12) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (m === 0) return `${y} yr${y === 1 ? "" : "s"}`;
    return `${y} yr ${m} mo`;
  }
  return `${months} mo`;
}

/** Parse YYYY-MM-DD or full ISO to local date. */
export function parseIsoDate(iso: string): Date | null {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole months from `start` to `end` (inclusive-ish; at least 1 if end > start). */
export function wholeMonthsBetween(start: Date, end: Date): number {
  if (end <= start) return 1;
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(1, months);
}

/**
 * Fixed monthly payment to fully amortize `principal` over `months` at `annualAprPct`.
 * Standard loan payment formula; 0% APR → principal / months.
 */
export function impliedMonthlyPaymentForTerm(
  principal: number,
  annualAprPct: number | undefined,
  months: number,
): number | null {
  if (principal <= 0 || months <= 0) return null;
  const apr = annualAprPct ?? 0;
  const r = apr / 100 / 12;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

/**
 * Amortizing monthly payment implied by servicer payoff horizon + current balance + APR.
 * Uses `expected_payoff_date`, or `loan_status.end_date` when payoff date is absent (Plaid varies by servicer).
 */
export function servicerStudentPayoffSchedule(
  d: DebtRow,
): { payoffDate: Date; monthsRemaining: number; impliedMonthlyPayment: number } | null {
  if (d.loanType !== "student") return null;
  const meta = d.studentLoanMeta;
  if (!meta) return null;

  const iso =
    (meta.expectedPayoffDate && String(meta.expectedPayoffDate).trim()) ||
    (meta.loanStatusEndDate && String(meta.loanStatusEndDate).trim()) ||
    null;
  if (!iso) return null;

  const end = parseIsoDate(iso);
  if (!end) return null;
  const now = new Date();
  if (end <= now) return null;

  const months = wholeMonthsBetween(now, end);
  const implied = impliedMonthlyPaymentForTerm(d.balance, d.apr, months);
  if (implied == null || !Number.isFinite(implied) || implied <= 0) return null;

  return {
    payoffDate: end,
    monthsRemaining: months,
    impliedMonthlyPayment: implied,
  };
}

export type AutoPayoffInsight = {
  kind: "servicer_payoff_date" | "min_payment_projection" | "none";
  payoffDate: Date | null;
  monthsRemaining: number | null;
  /** Level payment that matches the payoff horizon (servicer date → amortized; min-pay path → min). */
  impliedMonthlyPayment: number | null;
  aprUsed: number | undefined;
};

/**
 * Prefer servicer `expected_payoff_date` + current balance + APR → implied payment.
 * Else project payoff using Plaid minimum payment.
 */
export function computeAutoPayoffInsight(debt: DebtRow): AutoPayoffInsight {
  const sched = servicerStudentPayoffSchedule(debt);
  if (sched) {
    return {
      kind: "servicer_payoff_date",
      payoffDate: sched.payoffDate,
      monthsRemaining: sched.monthsRemaining,
      impliedMonthlyPayment: sched.impliedMonthlyPayment,
      aprUsed: debt.apr,
    };
  }

  const minP = Math.max(debt.minPayment, 1);
  const sim = simulateMonthsToPayoff(debt.balance, debt.apr, minP);
  if (sim.ok && sim.months > 0) {
    return {
      kind: "min_payment_projection",
      payoffDate: sim.payoffDate,
      monthsRemaining: sim.months,
      impliedMonthlyPayment: minP,
      aprUsed: debt.apr,
    };
  }

  return {
    kind: "none",
    payoffDate: null,
    monthsRemaining: null,
    impliedMonthlyPayment: null,
    aprUsed: debt.apr,
  };
}

/** Default slider value: amortized payment to servicer payoff date when available, else min payment. */
export function suggestedMonthlyPaymentForDebt(debt: DebtRow): number {
  const ins = computeAutoPayoffInsight(debt);
  if (ins.kind === "servicer_payoff_date") {
    if (ins.impliedMonthlyPayment != null && Number.isFinite(ins.impliedMonthlyPayment)) {
      const raw = Math.max(ins.impliedMonthlyPayment, debt.minPayment, 1);
      return Math.max(5, Math.round(raw / 5) * 5);
    }
    return Math.max(debt.minPayment, 1);
  }
  if (ins.kind === "min_payment_projection" && ins.impliedMonthlyPayment != null) {
    return Math.max(5, Math.round(ins.impliedMonthlyPayment / 5) * 5);
  }
  return Math.max(debt.minPayment, 1);
}
