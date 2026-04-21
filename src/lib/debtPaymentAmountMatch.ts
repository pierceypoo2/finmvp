import type { CategoryLocks } from "@/lib/auditStorage";
import { normalizeMerchantKey } from "@/lib/auditStorage";
import { suggestedMonthlyPaymentForDebt } from "@/lib/debtPayoff";
import { isIncomeLikePositiveCredit } from "@/lib/txAccount";
import type { DebtPaymentSuggestion, DebtRow, TxRow } from "@/lib/types";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Build expected payment amounts from linked debts (min, modeled monthly, last student-loan payment). */
export function debtPaymentCandidateAmounts(debts: DebtRow[]): number[] {
  const set = new Set<number>();
  for (const d of debts) {
    if (!Number.isFinite(d.balance) || d.balance <= 0) continue;
    const min = Math.max(0, d.minPayment);
    if (min > 0) set.add(roundMoney(min));
    const sug = suggestedMonthlyPaymentForDebt(d);
    if (sug > 0) set.add(roundMoney(sug));
    const last = d.studentLoanMeta?.lastPaymentAmount;
    if (last != null && Number.isFinite(last) && last > 0) set.add(roundMoney(last));
  }
  return [...set];
}

export function matchesCandidate(amount: number, candidate: number): boolean {
  const a = roundMoney(amount);
  const c = roundMoney(candidate);
  if (Math.abs(a - c) < 0.02) return true;
  if (Math.abs(a - c) <= 1) return true;
  return false;
}

type MatchKind = "min_payment" | "scheduled_payment" | "last_payment";

function matchKindForDebt(amount: number, d: DebtRow): MatchKind | null {
  const min = Math.max(0, d.minPayment);
  if (min > 0 && matchesCandidate(amount, roundMoney(min))) return "min_payment";
  const sug = suggestedMonthlyPaymentForDebt(d);
  if (sug > 0 && matchesCandidate(amount, roundMoney(sug))) return "scheduled_payment";
  const last = d.studentLoanMeta?.lastPaymentAmount;
  if (last != null && Number.isFinite(last) && last > 0 && matchesCandidate(amount, roundMoney(last))) {
    return "last_payment";
  }
  return null;
}

/** All debts whose min / scheduled / last payment amount matches this outflow. */
function debtsMatchingAmount(amount: number, debts: DebtRow[]): { debt: DebtRow; matchedOn: MatchKind }[] {
  const out: { debt: DebtRow; matchedOn: MatchKind }[] = [];
  for (const d of debts) {
    if (!Number.isFinite(d.balance) || d.balance <= 0) continue;
    const k = matchKindForDebt(amount, d);
    if (k) out.push({ debt: d, matchedOn: k });
  }
  return out;
}

function pickBestDebtMatch(
  tx: TxRow,
  matches: { debt: DebtRow; matchedOn: MatchKind }[],
): { debt: DebtRow; matchedOn: MatchKind } | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  const m = normalizeMerchantKey(tx.merchant);
  for (const cand of matches) {
    const parts = normalizeMerchantKey(cand.debt.name).split(/\s+/).filter((w) => w.length > 3);
    for (const w of parts) {
      if (m.includes(w)) return cand;
    }
  }
  const student = matches.find((x) => x.debt.loanType === "student");
  if (student) return student;
  return matches[0];
}

/**
 * Attach a single debt hint for user confirmation — does **not** change `category`.
 * Until the user confirms, metrics treat the row as its current category (not debt_payment).
 */
export function attachDebtPaymentSuggestions(
  txs: TxRow[],
  debts: DebtRow[],
  locks?: CategoryLocks | null,
  dismissedIds?: Set<string> | null,
): TxRow[] {
  if (!debts.length) {
    return txs.map((t) => (t.debtPaymentSuggestion ? { ...t, debtPaymentSuggestion: undefined } : t));
  }

  return txs.map((t) => {
    const base = t.debtPaymentSuggestion ? { ...t, debtPaymentSuggestion: undefined } : { ...t };

    if (dismissedIds?.has(t.id)) return base;
    if (t.amount <= 0) return base;
    if (t.category === "debt_payment") return base;
    if (t.category === "income" || t.plaidPfcIncome) return base;
    if (isIncomeLikePositiveCredit(t)) return base;
    if (t.category === "rent") return base;

    if (locks) {
      if (locks.txIds.has(t.id)) return base;
      if (locks.merchantKeys.has(normalizeMerchantKey(t.merchant))) return base;
    }

    const candidates = debtsMatchingAmount(t.amount, debts);
    const picked = pickBestDebtMatch(t, candidates);
    if (!picked) return base;

    const suggestion: DebtPaymentSuggestion = {
      debtId: picked.debt.id,
      debtName: picked.debt.name,
      matchedOn: picked.matchedOn,
    };

    return { ...base, debtPaymentSuggestion: suggestion };
  });
}
