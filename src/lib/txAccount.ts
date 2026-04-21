import type { TxRow } from "@/lib/types";

/** True when the transaction is on a credit card (uses Plaid account type when present). */
export function isCreditAccountTx(tx: TxRow): boolean {
  if (tx.accountType) return tx.accountType === "credit";
  return tx.source === "credit";
}

/**
 * Some institutions post payroll / ACH credits to credit cards as **positive** amounts,
 * unlike typical Plaid card semantics (negative = payment into the card). Match those so
 * they count as cash in, not as spending, and show with a leading + in the UI.
 */
/** Payroll / ACH credit wording — used for credit-card sign quirks and depository “positive credit” quirks. */
const PAYROLL_OR_ACH_CREDIT_MERCHANT =
  /gusto|payroll|pay check|direct dep|direct deposit|paycheck|salary|wage|adp|paychex|ach electronic credit|electronic credit|employer pay/i;

/**
 * Some issuers post **card paydowns as positive** amounts on credit accounts (Plaid’s usual rule is
 * negative = payment into the card). Match common bill-pay / autopay descriptions so we still show
 * them as money into the card (+ green), not as a charge (−).
 */
const CREDIT_PAYDOWN_POSITIVE_AMOUNT_MERCHANT =
  /automatic\s+payment|autopay|online\s+payment|payment\s*[-–]\s*thank|thank\s+you.*payment|payment\s+thank|credit\s+card\s+payment|card\s+payment|bill\s+payment|payment\s+received|payment\s+confirmation/i;

export function isIncomeLikePositiveCredit(tx: TxRow): boolean {
  if (!isCreditAccountTx(tx) || tx.amount <= 0) return false;
  if (tx.plaidPfcIncome || tx.category === "income") return true;
  return PAYROLL_OR_ACH_CREDIT_MERCHANT.test(tx.merchant);
}

/**
 * Some banks / money-market accounts post payroll and ACH credits as **positive** amounts even though
 * Plaid’s usual depository rule is negative = money in. Treat like inflow for UI (+) and cash-in metrics.
 */
export function isDepositoryIncomeLikePositiveAmount(tx: TxRow): boolean {
  if (isCreditAccountTx(tx) || tx.amount <= 0) return false;
  const isDepository =
    (tx.accountType && tx.accountType !== "credit" && tx.accountType !== "loan") ||
    (!tx.accountType && tx.source === "bank");
  if (!isDepository) return false;
  if (tx.plaidPfcIncome || tx.category === "income") return true;
  return PAYROLL_OR_ACH_CREDIT_MERCHANT.test(tx.merchant);
}

/** Money into the account for display (+ green): Plaid negative, or rare positive payroll credits on cards. */
export function isUserFacingInflow(tx: TxRow): boolean {
  if (tx.amount < 0) return true;
  if (isIncomeLikePositiveCredit(tx)) return true;
  if (isDepositoryIncomeLikePositiveAmount(tx)) return true;
  // Positive amount on a credit account is usually a purchase — except mis-signed paydowns & Plaid debt_payment.
  if (isCreditAccountTx(tx) && tx.amount > 0) {
    if (tx.category === "debt_payment") return true;
    if (CREDIT_PAYDOWN_POSITIVE_AMOUNT_MERCHANT.test(tx.merchant)) return true;
  }
  return false;
}
