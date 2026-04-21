"use client";

import { GlassCard } from "@/components/GlassCard";
import { rankDebtsByPriority } from "@/lib/debtPriority";
import { debtPriorityLabel } from "@/lib/debtPriority";
import {
  amortizationBalanceSchedule,
  amortizationCumulativeInterestSchedule,
  computeAutoPayoffInsight,
  downsampleSchedule,
  formatMonthsLabel,
  formatPayoffDate,
  nperMonthsToPayoff,
  simulateMonthsToPayoff,
  suggestedMonthlyPaymentForDebt,
} from "@/lib/debtPayoff";
import { simulatePortfolioPayoff, simulatedPayoffOrder } from "@/lib/debtSim";
import { PlaidMortgageMetaAttach } from "@/components/debt/PlaidMortgageMetaAttach";
import { cfiBand, cfiBandLabel, formatCfiDisplay, cashFlowIndexForDebt } from "@/lib/cfi";
import { debtThreatTier, EFFICIENT_APR_PCT, hasPositiveBalance } from "@/lib/pillar3Gate";
import { MORTGAGE_PRODUCT_LABELS, type DebtRow } from "@/lib/types";
import { LineChart, ListOrdered, Sparkles } from "lucide-react";
import { DebtPayoffTimeline } from "@/components/debt/DebtPayoffTimeline";
import { useCallback, useEffect, useMemo, useState } from "react";

function fmtApr(apr: number | undefined) {
  if (apr == null || Number.isNaN(apr)) return "—";
  return `${Number(apr.toFixed(2))}%`;
}

function loanTypeLabel(t?: string) {
  if (!t) return null;
  const map: Record<string, string> = {
    credit_card: "Credit card",
    student: "Student loan",
    mortgage: "Mortgage",
    auto_loan: "Auto loan",
  };
  return map[t] ?? t.replace(/_/g, " ");
}

type Tab = "debt" | "analysis";

function paymentFor(d: DebtRow, override: number | undefined): number {
  if (override !== undefined && Number.isFinite(override)) return override;
  return suggestedMonthlyPaymentForDebt(d);
}

function sliderMax(d: DebtRow): number {
  const base = Math.max(d.minPayment, 1);
  const cap = Math.ceil(d.balance * 1.5);
  const wide = Math.max(base * 80, Math.ceil(d.balance));
  return Math.max(base * 2, Math.min(cap, wide));
}

function rangeBounds(d: DebtRow): { lo: number; hi: number } {
  const lo = Math.max(1, Math.floor(d.minPayment));
  const hi = Math.max(sliderMax(d), lo + 5);
  return { lo, hi };
}

function fmtUsd(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

/** APR and Plaid/servicer monthly payment snapshot (shown on Analysis only; sliders model scenarios). */
function DebtPlaidPaymentSnapshot({ debt }: { debt: DebtRow }) {
  const insight = computeAutoPayoffInsight(debt);
  const isCard = debt.loanType === "credit_card";

  const aprStr = fmtApr(debt.apr);

  let paymentLabel: string;
  let paymentStr: string;
  let payoffStr: string;

  if (isCard) {
    paymentLabel = "Min payment";
    const minP = Math.max(debt.minPayment, 0);
    paymentStr = fmtUsd(minP) ?? "—";
    const sim = simulateMonthsToPayoff(debt.balance, debt.apr, Math.max(debt.minPayment, 1));
    payoffStr = sim.ok ? formatPayoffDate(sim.payoffDate) : "—";
  } else {
    paymentLabel = "Monthly payment";
    const suggested = suggestedMonthlyPaymentForDebt(debt);
    const payNum =
      insight.impliedMonthlyPayment != null && Number.isFinite(insight.impliedMonthlyPayment)
        ? insight.impliedMonthlyPayment
        : suggested;
    paymentStr = fmtUsd(payNum) ?? "—";
    if (insight.payoffDate) {
      payoffStr = formatPayoffDate(insight.payoffDate);
    } else {
      const sim = simulateMonthsToPayoff(debt.balance, debt.apr, suggested);
      payoffStr = sim.ok ? formatPayoffDate(sim.payoffDate) : "—";
    }
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <dl className="space-y-2 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500 dark:text-white/45">APR</dt>
          <dd className="font-medium tabular-nums text-slate-900 dark:text-white">{aprStr}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500 dark:text-white/45">{paymentLabel}</dt>
          <dd className="font-medium tabular-nums text-slate-900 dark:text-white">{paymentStr}/mo</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500 dark:text-white/45">Payoff date</dt>
          <dd className="font-medium text-slate-900 dark:text-white">{payoffStr}</dd>
        </div>
      </dl>
    </div>
  );
}

export function DebtMapGamify({
  sortedDebts,
}: {
  sortedDebts: DebtRow[];
}) {
  const [tab, setTab] = useState<Tab>("debt");
  const [paymentByDebt, setPaymentByDebt] = useState<Record<string, number>>({});

  useEffect(() => {
    setPaymentByDebt((prev) => {
      const next = { ...prev };
      for (const d of sortedDebts) {
        if (next[d.id] === undefined) {
          next[d.id] = suggestedMonthlyPaymentForDebt(d);
        }
      }
      for (const k of Object.keys(next)) {
        if (!sortedDebts.find((d) => d.id === k)) delete next[k];
      }
      return next;
    });
  }, [sortedDebts]);

  const setPayment = useCallback((id: string, value: number) => {
    setPaymentByDebt((p) => ({ ...p, [id]: value }));
  }, []);

  const simOrder = useMemo(
    () => simulatedPayoffOrder(sortedDebts, paymentByDebt),
    [sortedDebts, paymentByDebt],
  );

  const payoffCompare = useMemo(() => {
    if (sortedDebts.length === 0) return null;

    const monthlyBudgetTotal = sortedDebts.reduce((sum, d) => sum + paymentFor(d, paymentByDebt[d.id]), 0);
    const currentOrder = sortedDebts;
    const avalancheOrder = rankDebtsByPriority(sortedDebts);

    const current = simulatePortfolioPayoff(sortedDebts, monthlyBudgetTotal, currentOrder);
    const avalanche = simulatePortfolioPayoff(sortedDebts, monthlyBudgetTotal, avalancheOrder);

    if (!current.ok || !avalanche.ok) return { monthlyBudgetTotal, current, avalanche };

    return {
      monthlyBudgetTotal,
      current,
      avalanche,
      monthsShaved: Math.max(0, current.months - avalanche.months),
      interestSaved: Math.max(0, current.totalInterest - avalanche.totalInterest),
    };
  }, [sortedDebts, paymentByDebt]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1 dark:border-white/10 dark:bg-white/[0.03]">
        <button
          type="button"
          onClick={() => setTab("debt")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
            tab === "debt"
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90 dark:bg-white/10 dark:text-white dark:ring-0"
              : "text-slate-600 hover:text-slate-900 dark:text-white/45 dark:hover:text-white/70"
          }`}
        >
          <ListOrdered className="h-4 w-4" />
          Debt
        </button>
        <button
          type="button"
          onClick={() => setTab("analysis")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
            tab === "analysis"
              ? "bg-emerald-100 text-emerald-900 shadow-sm ring-1 ring-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-0"
              : "text-slate-600 hover:text-slate-900 dark:text-white/45 dark:hover:text-white/70"
          }`}
        >
          <LineChart className="h-4 w-4" />
          Analysis
        </button>
      </div>

      {tab === "debt" && (
        <GlassCard>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/35">
            Payoff priority
          </p>
          <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Debts ({sortedDebts.length})
          </p>
          {sortedDebts.length === 0 ? (
            <p className="text-xs font-light text-slate-500 dark:text-white/35">No debts to show.</p>
          ) : (
            <ul className="space-y-0">
              {sortedDebts.map((d, i) => {
                const n = i + 1;
                const pri = debtPriorityLabel(d);
                const priCls =
                  pri === "high"
                    ? "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
                    : pri === "medium"
                      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
                      : "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/45";
                const priText =
                  pri === "high" ? "Higher APR" : pri === "medium" ? "Watch" : "Lower APR";

                const threatTier = hasPositiveBalance(d) ? debtThreatTier(d) : null;
                let tierLabel: string | null = null;
                if (threatTier === 1) {
                  tierLabel =
                    d.apr == null || !Number.isFinite(d.apr)
                      ? "Level 1 · confirm APR"
                      : "Level 1 · above 15% · no refi cheat";
                } else if (threatTier === 2) {
                  tierLabel = "Level 2 · refi zone (10–15%)";
                } else if (threatTier === 3 && hasPositiveBalance(d)) {
                  tierLabel =
                    d.apr != null && d.apr <= EFFICIENT_APR_PCT
                      ? "Level 3 · efficient (≤6%)"
                      : "Level 3 · stable (≤10%)";
                }

                const cfi = cashFlowIndexForDebt(d);
                const cfiZone = cfiBand(cfi);

                return (
                  <li
                    key={d.id}
                    className="border-b border-slate-200/80 last:border-0 dark:border-white/[0.06]"
                  >
                    <div className="flex w-full items-start gap-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                        {n}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-medium text-slate-900 dark:text-white">{d.name}</span>
                            <span className="ml-2 text-[10px] font-light uppercase text-slate-400 dark:text-white/25">
                              {d.source}
                            </span>
                            {d.loanType && (
                              <span className="ml-1.5 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:border-white/10 dark:text-white/40">
                                {loanTypeLabel(d.loanType)}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 tabular-nums text-sm font-medium text-slate-900 dark:text-white">
                            ${d.balance.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {tierLabel && (
                            <span className="inline-flex rounded-lg border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-900 dark:text-violet-200/90">
                              {tierLabel}
                            </span>
                          )}
                          <span
                            className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-medium ${priCls}`}
                          >
                            {priText}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-white/35">
                            CFI{" "}
                            <span className="tabular-nums text-slate-800 dark:text-white/70">
                              {formatCfiDisplay(cfi)}
                            </span>
                            {cfiZone && (
                              <span className="ml-1 text-[10px] text-slate-400 dark:text-white/30">
                                · {cfiBandLabel(cfiZone)}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-white/35">
                            APR{" "}
                            <span className="tabular-nums text-slate-800 dark:text-white/70">
                              {fmtApr(d.apr)}
                            </span>
                          </span>
                        </div>
                        {d.loanType === "mortgage" && (
                          <div className="mt-1.5 space-y-2">
                            {d.mortgageMeta && (
                              <p className="text-[11px] font-light text-slate-600 dark:text-white/40">
                                Term {d.mortgageMeta.termYears} yr ·{" "}
                                {MORTGAGE_PRODUCT_LABELS[d.mortgageMeta.productType]}
                              </p>
                            )}
                            {d.source === "plaid" && (
                              <PlaidMortgageMetaAttach debtId={d.id} meta={d.mortgageMeta} />
                            )}
                            {d.source === "manual" && !d.mortgageMeta && (
                              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
                                Missing term or loan type — re-enter from + → Add mortgage manually with
                                full fields.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>
      )}

      {tab === "analysis" && (
        <GlassCard>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Adjust payments</p>
          </div>
          {sortedDebts.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-white/35">No debts.</p>
          ) : (
            <>
              {payoffCompare && (
                <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/35">
                    Time-to-payoff calculator
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/30">
                        Current order (CFI)
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                        {"ok" in payoffCompare.current && payoffCompare.current.ok
                          ? formatMonthsLabel(payoffCompare.current.months)
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-900/70 dark:text-emerald-200/70">
                        Optimized order (APR avalanche)
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-900 dark:text-emerald-200">
                        {"ok" in payoffCompare.avalanche && payoffCompare.avalanche.ok
                          ? formatMonthsLabel(payoffCompare.avalanche.months)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {"monthsShaved" in payoffCompare &&
                    typeof payoffCompare.monthsShaved === "number" &&
                    typeof payoffCompare.interestSaved === "number" && (
                    <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-sm dark:border-emerald-400/20 dark:bg-emerald-500/10">
                      <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                        Potential time saved: {formatMonthsLabel(payoffCompare.monthsShaved)}
                      </p>
                      <p className="mt-1 text-xs font-light text-emerald-900/80 dark:text-emerald-200/70">
                        Interest saved (estimate):{" "}
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(payoffCompare.interestSaved)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <ul className="space-y-5">
                {sortedDebts.map((d) => (
                  <AnalysisDebtRow
                    key={d.id}
                    d={d}
                    payment={paymentFor(d, paymentByDebt[d.id])}
                    onPaymentChange={(v) => setPayment(d.id, v)}
                  />
                ))}
              </ul>

              <div className="mt-8 border-t border-slate-200/90 pt-5 dark:border-white/10">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400/80">
                  Simulated finish order
                </p>
                <ol className="space-y-2 text-sm">
                  {simOrder.map((d, i) => {
                    const pmt = paymentFor(d, paymentByDebt[d.id]);
                    const sim = nperMonthsToPayoff(d.balance, d.apr, pmt);
                    return (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                            {i + 1}
                          </span>
                          <span className="truncate font-medium text-slate-900 dark:text-white">
                            {d.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-600 dark:text-white/45">
                          {sim.ok ? formatMonthsLabel(sim.months) : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}
        </GlassCard>
      )}
    </div>
  );
}

function AnalysisDebtRow({
  d,
  payment,
  onPaymentChange,
}: {
  d: DebtRow;
  payment: number;
  onPaymentChange: (n: number) => void;
}) {
  const { lo, hi } = rangeBounds(d);
  const clamped = Math.min(hi, Math.max(lo, payment));
  const sim = nperMonthsToPayoff(d.balance, d.apr, clamped);

  const { scheduleBalances, scheduleInterest } = useMemo(() => {
    const rawBal = amortizationBalanceSchedule(d.balance, d.apr, clamped);
    const rawInt = amortizationCumulativeInterestSchedule(d.balance, d.apr, clamped);
    const n = Math.min(rawBal.length, rawInt.length);
    const bal = downsampleSchedule(rawBal.slice(0, n), 56);
    const int = downsampleSchedule(rawInt.slice(0, n), 56);
    return { scheduleBalances: bal, scheduleInterest: int };
  }, [d.balance, d.apr, clamped]);

  return (
    <li className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium leading-tight text-slate-900 dark:text-white">{d.name}</p>
          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-white/40">
            Balance ${d.balance.toLocaleString()}
            {d.loanType ? ` · ${loanTypeLabel(d.loanType)}` : ""}
          </p>
          {d.loanType === "mortgage" && d.mortgageMeta && (
            <p className="mt-1 text-[10px] text-slate-500 dark:text-white/35">
              {d.mortgageMeta.termYears} yr · {MORTGAGE_PRODUCT_LABELS[d.mortgageMeta.productType]}
            </p>
          )}
        </div>
      </div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/30">
        Plaid / servicer snapshot
      </p>
      <DebtPlaidPaymentSnapshot debt={d} />
      <p className="mb-1 mt-4 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/30">
        Scenario monthly payment
      </p>
      <p className="mb-1 text-xs tabular-nums text-slate-700 dark:text-white/55">
        ${clamped.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
      </p>
      <input
        type="range"
        className="mb-3 w-full accent-emerald-400"
        min={lo}
        max={hi}
        step={5}
        value={clamped}
        onChange={(e) => onPaymentChange(Number(e.target.value))}
      />
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/30">
        Balance timeline
      </p>
      <DebtPayoffTimeline balances={scheduleBalances} cumulativeInterest={scheduleInterest} />
      {sim.ok ? (
        <p className="mt-2 text-sm text-slate-700 dark:text-white/75">
          <span className="text-slate-500 dark:text-white/45">~</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            {formatMonthsLabel(sim.months)}
          </span>
          <span className="text-slate-500 dark:text-white/45"> left · </span>
          <span className="text-slate-600 dark:text-white/60">{formatPayoffDate(sim.payoffDate)}</span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">
          Increase payment to exceed interest.
        </p>
      )}
    </li>
  );
}
