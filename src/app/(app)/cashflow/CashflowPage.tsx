"use client";

import { DebtSuggestionConfirm } from "@/components/DebtSuggestionConfirm";
import { GlassCard } from "@/components/GlassCard";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SavingsTargetBar } from "@/components/SavingsTargetBar";
import { useFinancial } from "@/context/FinancialContext";
import { stablePointAwardId } from "@/lib/pointAwards";
import { POINTS } from "@/lib/pointsRules";
import {
  essentialVsDiscretionary,
  estimatedDebtPayments30d,
  estimatedIncome30d,
  estimatedSpend30d,
  estimatedTotalOutflows30d,
  forCashflowWindow,
  spendByCategory,
} from "@/lib/cashflow";
import {
  formatUsdSigned,
  signedBalanceForNetWorth,
  totalNetWorthBalance,
} from "@/lib/accountNetWorth";
import { isUserFacingInflow } from "@/lib/txAccount";
import { CATEGORY_META } from "@/lib/types";
import type { SpendCategory } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function buildMonthOptions(count: number) {
  const now = new Date();
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return months;
}

export default function CashflowPage() {
  const router = useRouter();
  const {
    transactions,
    accounts,
    trueFreeCashFlow,
    savingsRatePct,
    refreshTransactions,
    selectedMonth,
    setSelectedMonth,
    unlinkAccount,
    awardPointsOnce,
  } = useFinancial();

  const [expandedAcct, setExpandedAcct] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categorizeSwiperOpen, setCategorizeSwiperOpen] = useState(false);

  const monthOptions = useMemo(() => buildMonthOptions(12), []);
  const activeIdx = useMemo(() => {
    if (!selectedMonth) return 0;
    return monthOptions.findIndex(
      (m) => m.year === selectedMonth.year && m.month === selectedMonth.month,
    );
  }, [selectedMonth, monthOptions]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.children[activeIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeIdx]);

  useEffect(() => {
    localStorage.setItem("ta_active_section", "cashflow");
  }, []);

  const selectMonth = useCallback(
    async (m: { year: number; month: number } | null) => {
      setSelectedMonth(m);
      setLoading(true);
      try {
        if (m) {
          await refreshTransactions(m.year, m.month);
        } else {
          await refreshTransactions();
        }
      } finally {
        setLoading(false);
      }
    },
    [refreshTransactions, setSelectedMonth],
  );

  const goLeft = useCallback(() => {
    if (activeIdx <= 0) {
      selectMonth(null);
    } else {
      const m = monthOptions[activeIdx - 1];
      selectMonth({ year: m.year, month: m.month });
    }
  }, [activeIdx, monthOptions, selectMonth]);

  const goRight = useCallback(() => {
    const nextIdx = Math.min(activeIdx + 1, monthOptions.length - 1);
    const m = monthOptions[nextIdx];
    selectMonth({ year: m.year, month: m.month });
  }, [activeIdx, monthOptions, selectMonth]);

  const txForMetrics = useMemo(
    () => forCashflowWindow(transactions, selectedMonth),
    [transactions, selectedMonth],
  );
  const cashIn = useMemo(() => estimatedIncome30d(txForMetrics), [txForMetrics]);
  const totalLinkedNet = useMemo(() => totalNetWorthBalance(accounts), [accounts]);
  const spend = useMemo(() => estimatedSpend30d(txForMetrics), [txForMetrics]);
  const debtPayments = useMemo(() => estimatedDebtPayments30d(txForMetrics), [txForMetrics]);
  const totalOutflows = useMemo(() => estimatedTotalOutflows30d(txForMetrics), [txForMetrics]);
  const { essential } = useMemo(
    () => essentialVsDiscretionary(txForMetrics),
    [txForMetrics],
  );
  const catBreakdown = useMemo(() => spendByCategory(txForMetrics), [txForMetrics]);
  const topCategories = useMemo(() => {
    return (Object.entries(catBreakdown) as [SpendCategory, number][])
      .filter(([, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [catBreakdown]);
  const breakdownDenominator = totalOutflows > 0 ? totalOutflows : 1;
  const flowDenominator = cashIn + totalOutflows > 0 ? cashIn + totalOutflows : 1;
  const uncategorized = txForMetrics.filter(
    (t) => t.category === "uncategorized" && !t.debtPaymentSuggestion,
  ).length;

  const periodLabel = useMemo(() => {
    if (!selectedMonth) return "Last 30 days of transactions · linked accounts";
    const m = monthOptions.find(
      (o) => o.year === selectedMonth.year && o.month === selectedMonth.month,
    );
    return m ? `${m.label} · linked accounts` : "linked accounts";
  }, [selectedMonth, monthOptions]);

  return (
    <div className="flex flex-col gap-7 pt-2">
      {/* header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          onClick={() => localStorage.removeItem("ta_active_section")}
          className="hit-44 flex items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="label-light text-slate-400 dark:text-white/35">Pillar 1</p>
          <h1 className="text-2xl font-semibold tracking-tight">Cash Flow</h1>
        </div>
      </div>

      {/* month picker */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goLeft}
          disabled={activeIdx <= 0 && !selectedMonth}
          className="hit-44 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/40 transition hover:text-white disabled:opacity-20"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex flex-1 gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {monthOptions.map((m, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={`${m.year}-${m.month}`}
                type="button"
                onClick={() =>
                  i === 0 && !selectedMonth
                    ? undefined
                    : selectMonth(
                        i === 0 ? null : { year: m.year, month: m.month },
                      )
                }
                className={`shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-medium transition ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-white/40 hover:bg-white/5 hover:text-white/60"
                }`}
              >
                {i === 0 && !selectedMonth ? "Now" : m.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={goRight}
          disabled={activeIdx >= monthOptions.length - 1}
          className="hit-44 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/40 transition hover:text-white disabled:opacity-20"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <DebtSuggestionConfirm className="mb-2" />

      {uncategorized > 0 && (
        <Link
          href="/calibration"
          className="block rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[13px] font-light leading-snug text-amber-100/95 transition hover:border-amber-400/40 hover:bg-amber-500/15"
        >
          <span className="font-medium">{uncategorized} uncategorized</span>
          <span className="text-amber-100/75"> — open calibration to review</span>
        </Link>
      )}

      {/* hero */}
      <div className="relative">
        <p className="label-light mb-3 text-slate-400 dark:text-white/35">
          Cashflow
        </p>
        <p
          className={`numeral text-[clamp(2.5rem,8vw,4rem)] leading-none tracking-tighter ${
            trueFreeCashFlow >= 0 ? "" : "text-orange-400"
          }`}
        >
          {trueFreeCashFlow < 0 ? "-" : ""}$
          {Math.abs(trueFreeCashFlow).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="mt-3 text-sm font-light text-emerald-600 dark:text-emerald-300/70">
          {periodLabel}
        </p>
        {loading && (
          <div className="absolute right-0 top-0 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400/60" />
            <span className="text-[10px] font-light text-white/30">Loading…</span>
          </div>
        )}
      </div>

      {/* cashflow breakdown */}
      <GlassCard>
        <div className="space-y-3">
          {transactions.length > 0 && txForMetrics.length === 0 && !selectedMonth && (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[12px] font-light leading-relaxed text-amber-100/90">
              No transactions in the{" "}
              <span className="font-medium">last 30 days</span> in the data we loaded. Use the month
              scroller to view older periods, or wait for new activity to sync.
            </p>
          )}
          {transactions.length === 0 && accounts.length > 0 && (
            <p className="text-[12px] font-light leading-relaxed text-slate-500 dark:text-white/40">
              No transactions returned yet—Plaid may still be syncing. Pull to refresh or check back
              shortly.
            </p>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-medium">Cash in</span>
            <span className="numeral text-[15px] font-semibold text-emerald-600 dark:text-emerald-300/90">
              ${cashIn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-medium">Living &amp; other spending</span>
            <span className="numeral text-[15px] font-semibold">
              ${spend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-medium">Debt payments</span>
            <span className="numeral text-[15px] font-semibold">
              ${debtPayments.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-light text-slate-400 dark:text-white/35">
              Essential spending
            </span>
            <span className="numeral text-[13px] font-light text-slate-400 dark:text-white/35">
              ${essential.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* spending by category + cash in */}
      {(topCategories.length > 0 || cashIn > 0) && (
        <GlassCard>
          <p className="mb-4 text-[11px] font-light uppercase tracking-wider text-slate-400 dark:text-white/30">
            Spending Breakdown
          </p>
          <div className="max-h-80 space-y-2.5 overflow-y-auto scrollbar-hide">
            {cashIn > 0 && (
              <div>
                <div className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <span>💰</span>
                    <span className="font-medium">Cash in</span>
                  </div>
                  <span className="numeral font-medium text-emerald-400">
                    ${cashIn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-emerald-400/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${(cashIn / flowDenominator) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
            {topCategories.map(([cat, amt]) => {
              const meta = CATEGORY_META[cat];
              const pct = (amt / breakdownDenominator) * 100;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <span>{meta.emoji}</span>
                      <span className="font-medium">{meta.label}</span>
                    </div>
                    <span className="numeral font-medium">
                      ${amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className={`h-full rounded-full ${meta.essential ? "bg-emerald-400/60" : "bg-orange-400/50"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.08] pt-3 text-[13px]">
            <span className="font-semibold">Total outflows</span>
            <span className="numeral font-semibold">
              ${totalOutflows.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        </GlassCard>
      )}

      {/* linked accounts */}
      {accounts.length > 0 && (
        <GlassCard>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-light uppercase tracking-wider text-slate-400 dark:text-white/30">
              Linked Accounts ({accounts.length})
            </p>
            <p
              className={`numeral text-[13px] font-medium ${
                totalLinkedNet < 0
                  ? "text-orange-500/95 dark:text-orange-300/85"
                  : "text-emerald-600/90 dark:text-emerald-300/80"
              }`}
            >
              Net total {formatUsdSigned(totalLinkedNet)}
            </p>
          </div>
          <ul className="space-y-1">
            {accounts.map((a) => {
              const isOpen = expandedAcct === a.id;
              const acctTxs = txForMetrics.filter((t) => {
                if (t.accountId) return t.accountId === a.id;
                if (a.type === "credit") return t.source === "credit";
                return t.source === "bank";
              });

              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedAcct(isOpen ? null : a.id)}
                    className="flex w-full items-center justify-between rounded-xl px-1 py-2.5 text-left transition hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold uppercase text-white/50">
                        {a.type.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium leading-tight">{a.name}</p>
                        <p className="text-[11px] font-light capitalize text-slate-400 dark:text-white/30">
                          {a.subtype ?? a.type}
                          {a.mask && <span> ••{a.mask}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.balance != null && (
                        <div className="text-right">
                          <span
                            className={`numeral text-[13px] font-medium ${
                              (signedBalanceForNetWorth(a) ?? 0) < 0
                                ? "text-orange-400/90"
                                : ""
                            }`}
                          >
                            {formatUsdSigned(signedBalanceForNetWorth(a) ?? a.balance)}
                          </span>
                          <p className="text-[9px] font-light text-white/20">net</p>
                        </div>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 text-white/20 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="border-t border-white/[0.06] pb-2 pt-3">
                          {acctTxs.length > 0 ? (
                            <>
                              <p className="mb-2 text-[10px] font-light text-white/25">
                                {acctTxs.length} transactions ·{" "}
                                {periodLabel.split(" · ")[0].toLowerCase()}
                              </p>
                              <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto overscroll-contain scrollbar-hide">
                                {acctTxs
                                  .sort((x, y) => y.date.localeCompare(x.date))
                                  .map((t) => {
                                    const isInflow = isUserFacingInflow(t);
                                    return (
                                      <li
                                        key={t.id}
                                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px]"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span className="font-medium truncate">{t.merchant}</span>
                                            {t.category !== "uncategorized" && (
                                              <span className="shrink-0 text-[9px] text-white/20">
                                                {CATEGORY_META[t.category].emoji}
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10px] font-light text-white/25">
                                            {t.date}
                                          </span>
                                        </div>
                                        <span
                                          className={`numeral ml-3 shrink-0 font-medium ${
                                            isInflow ? "text-emerald-400" : "text-white/70"
                                          }`}
                                        >
                                          {isInflow ? "+" : "-"}$
                                          {Math.abs(t.amount).toFixed(2)}
                                        </span>
                                      </li>
                                    );
                                  })}
                              </ul>
                            </>
                          ) : (
                            <p className="py-2 text-center text-[11px] font-light text-white/25">
                              No transactions for this period.
                            </p>
                          )}
                          <div className="mt-3 flex justify-end">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                unlinkAccount(a.id);
                                setExpandedAcct(null);
                              }}
                              className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-400 transition hover:bg-red-500/20"
                            >
                              <X className="h-3 w-3" />
                              Unlink
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      )}

      {/* savings vs 20% goal */}
      <GlassCard>
        <SavingsTargetBar savingsRatePct={savingsRatePct} />
      </GlassCard>

      {/* hard block: outflows > cash in */}
      {trueFreeCashFlow < 0 && (
        <GlassCard className="border-orange-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
            <div>
              <p className="text-[15px] font-medium">
                Outflows exceed cash in for this period.
              </p>
              <p className="mt-2 text-sm font-light leading-relaxed text-slate-500 dark:text-white/45">
                This might change if you have another account we haven&rsquo;t
                seen yet.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <PlaidLinkButton
              purpose="bank"
              onSuccess={async (info) => {
                await refreshTransactions();
                awardPointsOnce(
                  stablePointAwardId("cashflow_link_extra_bank", info.publicToken),
                  POINTS.LINK_ACCOUNT_GENERIC,
                );
              }}
            >
              Link another account
            </PlaidLinkButton>
          </div>
        </GlassCard>
      )}

      {/* calibration swiper — opens intro modal */}
      {uncategorized > 0 && (
        <button
          id="uncategorized-review"
          type="button"
          onClick={() => setCategorizeSwiperOpen(true)}
          className="hit-44 flex w-full items-center justify-center rounded-2xl border border-white/10 py-4 text-[15px] font-light transition hover:bg-white/5"
        >
          Calibration swiper — {uncategorized} remaining
        </button>
      )}

      <AnimatePresence>
        {categorizeSwiperOpen && (
          <motion.div
            key="categorize-swiper-modal"
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Close dialog"
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setCategorizeSwiperOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="categorize-swiper-title"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-[420px]"
            >
              <GlassCard className="relative">
                <button
                  type="button"
                  onClick={() => setCategorizeSwiperOpen(false)}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white/35 transition hover:bg-white/10 hover:text-white/60"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="label-light mb-2 text-slate-400 dark:text-white/35">Cash flow</p>
                <h2
                  id="categorize-swiper-title"
                  className="pr-10 text-xl font-semibold tracking-tight"
                >
                  Calibration swiper
                </h2>
                <p className="mt-3 text-[15px] font-light leading-relaxed text-slate-600 dark:text-white/55">
                  Swipe each transaction into the right category — fast, simple, and it keeps your
                  spending breakdown in sync with what you actually bought.
                </p>
                <p className="mt-3 text-[13px] font-light text-slate-500 dark:text-white/40">
                  {uncategorized} transaction{uncategorized === 1 ? "" : "s"} waiting.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategorizeSwiperOpen(false);
                      router.push("/calibration");
                    }}
                    className="hit-44 flex w-full items-center justify-center rounded-2xl bg-emerald-500/90 py-2.5 text-[15px] font-semibold text-white transition active:scale-[0.98]"
                  >
                    Open swiper
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategorizeSwiperOpen(false)}
                    className="hit-44 py-2 text-[14px] font-light text-white/45 transition hover:text-white/70"
                  >
                    Not now
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
