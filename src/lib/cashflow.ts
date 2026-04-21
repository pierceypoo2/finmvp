import { toLocalDateString } from "@/lib/dateLocal";
import {
  isCreditAccountTx,
  isDepositoryIncomeLikePositiveAmount,
  isIncomeLikePositiveCredit,
} from "@/lib/txAccount";
import type { ManualCashRow, SpendCategory, TxRow } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";

/**
 * Plaid sign convention (all account types):
 *   positive amount = money leaving the account (outflow / debit)
 *   negative amount = money entering the account (inflow / credit)
 *
 * Cash in (for net cashflow): sum of |amount| for money INTO an account (Plaid
 * negative amount). Includes paychecks and credit-card payments/refunds (negative
 * on the card). Skips bank-to-bank transfers (transfer category on non-credit only)
 * and Plaid `TRANSFER_IN_ACCOUNT_TRANSFER` (money between own accounts).
 */

/** Inflow counts toward “cash in” in metrics (see `estimatedIncome30d`). */
export function isCashInInflow(t: TxRow): boolean {
  if (t.plaidLikelyInternalTransfer) return false;
  if (t.plaidPfcIncome || t.category === "income") return true;
  if (isIncomeLikePositiveCredit(t)) return true;
  if (isDepositoryIncomeLikePositiveAmount(t)) return true;
  if (t.amount >= 0) return false;
  if (isCreditAccountTx(t)) return true;
  if (t.category === "transfer") return false;
  return true;
}

/** When no calendar month is selected, metrics use a rolling window (default 30 days). */
export function forCashflowWindow(
  txs: TxRow[],
  selectedMonth: { year: number; month: number } | null,
  rollingDays = 30,
): TxRow[] {
  if (selectedMonth) return txs;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rollingDays);
  const cutoffStr = toLocalDateString(cutoff);
  return txs.filter((t) => t.date >= cutoffStr);
}

/**
 * Money into any account (Plaid inflows). Uses {@link isCashInInflow} per transaction.
 */
export function estimatedIncome30d(txs: TxRow[]): number {
  let inc = 0;
  for (const t of txs) {
    if (!isCashInInflow(t)) continue;
    inc += Math.abs(t.amount);
  }
  return Math.round(inc * 100) / 100;
}

/** Positive outflows excluding income, transfers, and debt payments (living + discretionary). */
export function estimatedSpend30d(txs: TxRow[]): number {
  let s = 0;
  for (const t of txs) {
    if (t.amount <= 0) continue;
    if (isIncomeLikePositiveCredit(t)) continue;
    if (t.category === "income" || t.category === "transfer" || t.category === "debt_payment") continue;
    s += t.amount;
  }
  return Math.round(s * 100) / 100;
}

/** Loan / card paydowns detected from Plaid categories (and manual categorization). */
export function estimatedDebtPayments30d(txs: TxRow[]): number {
  let s = 0;
  for (const t of txs) {
    if (t.amount <= 0) continue;
    if (t.category !== "debt_payment") continue;
    s += t.amount;
  }
  return Math.round(s * 100) / 100;
}

export function estimatedTotalOutflows30d(txs: TxRow[]): number {
  return Math.round((estimatedSpend30d(txs) + estimatedDebtPayments30d(txs)) * 100) / 100;
}

export function essentialVsDiscretionary(txs: TxRow[]) {
  let essential = 0;
  let discretionary = 0;
  for (const t of txs) {
    if (t.amount <= 0) continue;
    if (isIncomeLikePositiveCredit(t)) continue;
    if (
      t.category === "income" ||
      t.category === "transfer" ||
      t.category === "uncategorized" ||
      t.category === "debt_payment"
    )
      continue;
    const meta = CATEGORY_META[t.category];
    if (meta.essential) essential += t.amount;
    else discretionary += t.amount;
  }
  return {
    essential: Math.round(essential * 100) / 100,
    discretionary: Math.round(discretionary * 100) / 100,
  };
}

/** Sums manual spreadsheet rows (amounts treated as monthly). */
export function manualCashRowTotals(rows: ManualCashRow[]): {
  income: number;
  essential: number;
  discretionary: number;
} {
  let income = 0;
  let essential = 0;
  let discretionary = 0;
  for (const r of rows) {
    const a = Number.isFinite(r.amount) ? r.amount : 0;
    if (r.kind === "income") income += a;
    else if (r.kind === "essential") essential += a;
    else discretionary += a;
  }
  return {
    income: Math.round(income * 100) / 100,
    essential: Math.round(essential * 100) / 100,
    discretionary: Math.round(discretionary * 100) / 100,
  };
}

/** Monthly net from manual income / expense lines (Settings → Manual mode). */
export function manualMonthlyNet(rows: ManualCashRow[]): number {
  const { income, essential, discretionary } = manualCashRowTotals(rows);
  return Math.round((income - essential - discretionary) * 100) / 100;
}

export function spendByCategory(txs: TxRow[]): Record<SpendCategory, number> {
  const out = {} as Record<SpendCategory, number>;
  for (const cat of Object.keys(CATEGORY_META) as SpendCategory[]) {
    out[cat] = 0;
  }
  for (const t of txs) {
    if (t.amount <= 0) continue;
    if (isIncomeLikePositiveCredit(t)) continue;
    if (t.category === "income" || t.category === "transfer") continue;
    out[t.category] += t.amount;
  }
  for (const cat of Object.keys(out) as SpendCategory[]) {
    out[cat] = Math.round(out[cat] * 100) / 100;
  }
  return out;
}

export function trueFreeCashFlow(txs: TxRow[]): number {
  return Math.round((estimatedIncome30d(txs) - estimatedTotalOutflows30d(txs)) * 100) / 100;
}

export function savingsRate(txs: TxRow[]): number | null {
  const income = estimatedIncome30d(txs);
  if (income <= 0) return null;
  return Math.round((trueFreeCashFlow(txs) / income) * 1000) / 1000;
}

export function signals(txs: TxRow[], hasBank: boolean) {
  const income = estimatedIncome30d(txs);
  const spend = estimatedTotalOutflows30d(txs);
  const net = income - spend;
  return {
    spendGTIncome: hasBank && income > 0 && spend > income,
    paycheckToPaycheck: hasBank && income > 0 && net >= 0 && net / income < 0.05,
    net,
  };
}

export function microQuestSuggestions(txs: TxRow[], targetCut = 50): string[] {
  const discretionary = txs
    .filter((t) => {
      if (t.amount <= 0) return false;
      if (
        t.category === "income" ||
        t.category === "transfer" ||
        t.category === "uncategorized" ||
        t.category === "debt_payment"
      )
        return false;
      const meta = CATEGORY_META[t.category];
      return !meta.essential;
    })
    .sort((a, b) => b.amount - a.amount);

  const suggestions: string[] = [];
  let running = 0;
  for (const w of discretionary) {
    if (running >= targetCut) break;
    suggestions.push(
      `Skip "${w.merchant}" ($${w.amount.toFixed(0)}) this week`,
    );
    running += w.amount;
  }
  if (suggestions.length === 0) {
      suggestions.push("Run calibration on more transactions to find cut opportunities.");
  }
  return suggestions;
}

export function detectP2PTransfers(txs: TxRow[]): number {
  const p2pPattern = /venmo|cashapp|cash app|zelle|paypal/i;
  let total = 0;
  for (const t of txs) {
    if (p2pPattern.test(t.merchant) && t.amount > 0) total += t.amount;
  }
  return Math.round(total * 100) / 100;
}
