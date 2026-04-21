import { getPlaidClient } from "@/lib/plaid";
import type { PlaidTokenSlot } from "@/lib/types";
import type { DebtRow, StudentLoanMeta } from "@/lib/types";
import type { APR, StudentLoan } from "plaid";
import { APRAprTypeEnum, AccountType, LoanAccountSubtype } from "plaid";
import { creditCardMinimumPaymentDisplay } from "@/lib/creditCardMin";

/** Prefer purchase APR, then lowest non-zero APR from Plaid’s list. */
function pickCreditCardApr(aprs: APR[] | null | undefined): number | undefined {
  if (!aprs?.length) return undefined;
  const purchase = aprs.find((a) => a.apr_type === APRAprTypeEnum.PurchaseApr);
  if (purchase?.apr_percentage != null) return purchase.apr_percentage;
  const sorted = [...aprs]
    .filter((a) => a.apr_percentage != null && (a.apr_percentage ?? 0) > 0)
    .sort((a, b) => (a.apr_percentage ?? 0) - (b.apr_percentage ?? 0));
  if (sorted[0]?.apr_percentage != null) return sorted[0].apr_percentage;
  return aprs[0]?.apr_percentage ?? undefined;
}

type DebtOut = DebtRow & { source: "plaid" };

/** Main row title: linked account name usually reflects the servicer; `loan_name` is often a product label like "Consolidation". */
function studentLoanDisplayName(
  s: StudentLoan,
  acc: { name: string | null; official_name: string | null } | undefined,
): string {
  const fromAccount = acc?.official_name?.trim() || acc?.name?.trim() || "";
  const fromLoan = s.loan_name?.trim() || "";
  if (fromAccount && fromLoan && fromAccount.toLowerCase() !== fromLoan.toLowerCase()) {
    return `${fromAccount} · ${fromLoan}`;
  }
  return fromAccount || fromLoan || "Student loan";
}

function studentLoanMetaFrom(s: StudentLoan): StudentLoanMeta {
  const addr = s.servicer_address;
  let servicerAddressLine: string | null = null;
  if (addr && (addr.street || addr.city || addr.region || addr.postal_code)) {
    const line = [addr.street, [addr.city, addr.region].filter(Boolean).join(", "), addr.postal_code]
      .filter(Boolean)
      .join(" · ");
    servicerAddressLine = line || null;
  }
  return {
    loanName: s.loan_name ?? null,
    expectedPayoffDate: s.expected_payoff_date ?? null,
    nextPaymentDueDate: s.next_payment_due_date ?? null,
    lastPaymentAmount: s.last_payment_amount ?? null,
    lastPaymentDate: s.last_payment_date ?? null,
    lastStatementIssueDate: s.last_statement_issue_date ?? null,
    lastStatementBalance: s.last_statement_balance ?? null,
    originationPrincipalAmount: s.origination_principal_amount ?? null,
    originationDate: s.origination_date ?? null,
    outstandingInterestAmount: s.outstanding_interest_amount ?? null,
    paymentReferenceNumber: s.payment_reference_number ?? null,
    accountNumber: s.account_number ?? null,
    sequenceNumber: s.sequence_number ?? null,
    isOverdue: s.is_overdue ?? null,
    loanStatusType: s.loan_status?.type != null ? String(s.loan_status.type) : null,
    loanStatusEndDate: s.loan_status?.end_date ?? null,
    repaymentPlanDescription: s.repayment_plan?.description ?? null,
    repaymentPlanType: s.repayment_plan?.type != null ? String(s.repayment_plan.type) : null,
    disbursementDates: s.disbursement_dates ?? null,
    ytdInterestPaid: s.ytd_interest_paid ?? null,
    ytdPrincipalPaid: s.ytd_principal_paid ?? null,
    guarantor: s.guarantor ?? null,
    servicerAddressLine,
  };
}

/** Liabilities for one Plaid Item (credit, student, mortgage, auto). */
export async function loadLiabilitiesForItem(slot: PlaidTokenSlot): Promise<DebtOut[]> {
  const plaid = getPlaidClient();
  const accessToken = slot.access_token;

  const [{ data: liab }, { data: accts }] = await Promise.all([
    plaid.liabilitiesGet({ access_token: accessToken }),
    plaid.accountsGet({ access_token: accessToken }),
  ]);

  const byId = new Map(accts.accounts.map((a) => [a.account_id, a]));
  const debts: DebtOut[] = [];
  const coveredAccountIds = new Set<string>();

  for (const c of liab.liabilities?.credit ?? []) {
    if (c.account_id) coveredAccountIds.add(c.account_id);
    const acc = c.account_id ? byId.get(c.account_id) : undefined;
    const balance = acc?.balances?.current ?? c.last_statement_balance ?? 0;
    const apr = pickCreditCardApr(c.aprs);
    debts.push({
      id: `plaid-cc-${c.account_id ?? debts.length}`,
      name: acc?.name || acc?.official_name || `Credit card`,
      balance,
      minPayment: creditCardMinimumPaymentDisplay(balance, apr, c.minimum_payment_amount),
      apr,
      source: "plaid",
      loanType: "credit_card",
    });
  }

  for (const s of liab.liabilities?.student ?? []) {
    if (s.account_id) coveredAccountIds.add(s.account_id);
    const acc = s.account_id ? byId.get(s.account_id) : undefined;
    const displayName = studentLoanDisplayName(s, acc);
    const studentMin =
      (s.minimum_payment_amount != null && s.minimum_payment_amount > 0
        ? s.minimum_payment_amount
        : null) ??
      (s.last_payment_amount != null && s.last_payment_amount > 0 ? s.last_payment_amount : null) ??
      0;

    debts.push({
      id: `plaid-sl-${s.account_id ?? debts.length}`,
      name: displayName,
      balance: acc?.balances?.current ?? s.last_statement_balance ?? 0,
      minPayment: studentMin,
      apr: s.interest_rate_percentage ?? undefined,
      source: "plaid",
      loanType: "student",
      studentLoanMeta: studentLoanMetaFrom(s),
    });
  }

  for (const m of liab.liabilities?.mortgage ?? []) {
    if (m.account_id) coveredAccountIds.add(m.account_id);
    const acc = m.account_id ? byId.get(m.account_id) : undefined;
    debts.push({
      id: `plaid-mtg-${m.account_id ?? debts.length}`,
      name: acc?.name || acc?.official_name || `Mortgage`,
      balance: acc?.balances?.current ?? m.origination_principal_amount ?? 0,
      minPayment: m.next_monthly_payment ?? 0,
      apr: m.interest_rate?.percentage ?? undefined,
      source: "plaid",
      loanType: "mortgage",
    });
  }

  for (const a of accts.accounts) {
    if (a.type !== AccountType.Loan) continue;
    if (String(a.subtype) !== LoanAccountSubtype.Auto) continue;
    if (!a.account_id || coveredAccountIds.has(a.account_id)) continue;
    coveredAccountIds.add(a.account_id);
    debts.push({
      id: `plaid-auto-${a.account_id}`,
      name: a.name || a.official_name || "Auto loan",
      balance: a.balances?.current ?? 0,
      minPayment: 0,
      apr: undefined,
      source: "plaid",
      loanType: "auto_loan",
    });
  }

  return debts;
}

/** Deduped debts across all linked Items. Skips Items without Liabilities product. */
export async function loadAllDebtsForPlaidItems(items: PlaidTokenSlot[]): Promise<DebtRow[]> {
  const all: DebtRow[] = [];
  for (const slot of items) {
    try {
      all.push(...(await loadLiabilitiesForItem(slot)));
    } catch {
      /* Item may be transactions-only */
    }
  }
  const unique = new Map<string, DebtRow>();
  for (const d of all) unique.set(d.id, d);
  return [...unique.values()];
}
