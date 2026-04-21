"use client";

import { GlassCard } from "@/components/GlassCard";
import { useFinancial } from "@/context/FinancialContext";
import type { DebtPaymentSuggestion, TxRow } from "@/lib/types";
import { useMemo } from "react";

function matchHint(m: DebtPaymentSuggestion["matchedOn"]): string {
  switch (m) {
    case "min_payment":
      return "matches this account’s minimum payment amount";
    case "scheduled_payment":
      return "matches the scheduled payment we modeled from your loan";
    case "last_payment":
      return "matches the last payment amount Plaid reported for this loan";
    default:
      return "matches a payment on file";
  }
}

function fmtUsd(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function SuggestionRow({
  tx,
  onConfirm,
  onDismiss,
}: {
  tx: TxRow & { debtPaymentSuggestion: DebtPaymentSuggestion };
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const s = tx.debtPaymentSuggestion;
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
      <p className="text-[13px] font-medium leading-snug text-slate-900 dark:text-white/90">
        Is this payment to <span className="text-amber-800 dark:text-amber-200/95">{s.debtName}</span>?
      </p>
      <p className="mt-1 text-[11px] font-light leading-relaxed text-slate-600 dark:text-white/45">
        {fmtUsd(tx.amount)} outflow · {matchHint(s.matchedOn)}. We won’t count it as a debt payment
        until you confirm.
      </p>
      <p className="mt-1 truncate text-[10px] font-light text-slate-500 dark:text-white/30">
        {tx.merchant} · {tx.date}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="hit-44 flex-1 rounded-xl bg-emerald-500/90 px-4 py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.98] sm:flex-none"
        >
          Yes, debt payment
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="hit-44 flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[13px] font-medium text-slate-700 transition active:scale-[0.98] dark:text-white/75 sm:flex-none"
        >
          No, not this
        </button>
      </div>
    </div>
  );
}

/**
 * User must confirm amount-based debt hints before they count as debt_payment in metrics.
 */
export function DebtSuggestionConfirm({ className }: { className?: string }) {
  const { transactions, confirmDebtPaymentSuggestion, dismissDebtPaymentSuggestion } = useFinancial();

  const pending = useMemo(
    () => transactions.filter((t): t is TxRow & { debtPaymentSuggestion: DebtPaymentSuggestion } => !!t.debtPaymentSuggestion),
    [transactions],
  );

  if (pending.length === 0) return null;

  return (
    <div id="debt-payment-confirm" className={`scroll-mt-24 ${className ?? ""}`}>
      <GlassCard className="border-amber-500/20 bg-amber-500/[0.04] dark:border-amber-500/15 dark:bg-amber-500/[0.05]">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-amber-800/90 dark:text-amber-300/80">
          Confirm debt payments
        </p>
        <p className="mb-4 text-xs font-light leading-relaxed text-slate-600 dark:text-white/45">
          These outflows match a payment amount from your linked debts. Confirm so they count in debt
          payments — nothing is assumed.
        </p>
        <ul className="space-y-3">
          {pending.map((tx) => (
            <li key={tx.id}>
              <SuggestionRow
                tx={tx}
                onConfirm={() => confirmDebtPaymentSuggestion(tx.id)}
                onDismiss={() => dismissDebtPaymentSuggestion(tx.id)}
              />
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
