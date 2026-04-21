import { LOAN_SERVICER_MERCHANT } from "@/lib/debtServicerPatterns";
import { getPlaidClient } from "@/lib/plaid";
import type { SpendCategory, TxRow } from "@/lib/types";
import type { Transaction } from "plaid";

/**
 * Plaid Personal Finance Category (v2): income, loan payments, card paydowns.
 * Values are typically UPPER_SNAKE_CASE; compare case-insensitively.
 * @see https://plaid.com/docs/api/products/transactions/
 */
export function categoryFromPlaidPfc(t: Transaction): SpendCategory | null {
  const p = (t.personal_finance_category?.primary ?? "").toUpperCase();
  const d = (t.personal_finance_category?.detailed ?? "").toUpperCase();
  if (p === "INCOME" || d.startsWith("INCOME_")) {
    return "income";
  }
  // Wages sometimes arrive under TRANSFER_IN_* instead of INCOME_*.
  if (
    d.startsWith("TRANSFER_IN_") &&
    (d.includes("PAYROLL") || d.includes("DIRECT_DEPOSIT") || d.includes("UNEMPLOYMENT"))
  ) {
    return "income";
  }
  if (p === "LOAN_PAYMENTS" || d.startsWith("LOAN_PAYMENTS_")) {
    return "debt_payment";
  }
  const raw = (t.merchant_name || t.name || "").trim();
  if (t.amount > 0 && LOAN_SERVICER_MERCHANT.test(raw)) {
    return "debt_payment";
  }
  return null;
}

export function txRowFromPlaid(
  t: Transaction,
  source: "credit" | "bank",
  accountType?: string | null,
): TxRow {
  const pfc = categoryFromPlaidPfc(t);
  const category = pfc ?? "uncategorized";
  const detailed = (t.personal_finance_category?.detailed ?? "").toUpperCase();
  /** Plaid: money moved between this user’s own accounts (not wages / external income). */
  const plaidLikelyInternalTransfer =
    t.amount < 0 && detailed === "TRANSFER_IN_ACCOUNT_TRANSFER";
  return {
    id: t.transaction_id,
    merchant: (t.merchant_name || t.name || "Unknown").trim(),
    amount: t.amount,
    date: t.date,
    pending: t.pending ?? false,
    accountId: t.account_id,
    accountType: accountType ?? null,
    source,
    audit: "uncategorized" as const,
    category,
    plaidPfcIncome: pfc === "income",
    plaidLikelyInternalTransfer,
  };
}

function httpStatus(e: unknown): number | undefined {
  return (e as { response?: { status?: number } })?.response?.status;
}

/**
 * Fetch transactions for one Plaid item and attach each row’s Plaid account type.
 * Returns [] if the Item has no Transactions product (e.g. legacy loan-only links) or Plaid errors — does not throw.
 */
export async function getPlaidTransactionsForItem(
  accessToken: string,
  source: "credit" | "bank",
  startDate: string,
  endDate: string,
): Promise<TxRow[]> {
  const plaid = getPlaidClient();

  let acctData;
  try {
    const { data } = await plaid.accountsGet({ access_token: accessToken });
    acctData = data;
  } catch {
    return [];
  }

  const typeByAccount = new Map(acctData.accounts.map((a) => [a.account_id, a.type]));

  const collected: Transaction[] = [];
  let offset = 0;
  try {
    for (;;) {
      const { data } = await plaid.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: { count: 500, offset },
      });
      collected.push(...data.transactions);
      if (collected.length >= data.total_transactions) break;
      offset += data.transactions.length;
    }
  } catch (e) {
    const st = httpStatus(e);
    if (st === 400 || st === 404) {
      return [];
    }
    console.warn(
      "[plaid] transactionsGet skipped for item:",
      st ?? "unknown",
      (e as Error)?.message ?? e,
    );
    return [];
  }

  return collected.map((t) =>
    txRowFromPlaid(t, source, typeByAccount.get(t.account_id) ?? null),
  );
}
