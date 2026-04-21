"use client";

import { GlassCard } from "@/components/GlassCard";
import { GlassSlideUnlock } from "@/components/GlassSlideUnlock";
import { Pillar3GateHint } from "@/components/Pillar3GateHint";
import { RefinanceCheatCard } from "@/components/RefinanceCheatCard";
import { useFinancial } from "@/context/FinancialContext";
import { manualCashRowTotals } from "@/lib/cashflow";
import { loadUnlockFlags, saveUnlockFlags } from "@/lib/unlocks";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Lock,
  PiggyBank,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

type MonthBucket = {
  key: string;
  label: string;
  income: number;
  spend: number;
  debtPayments: number;
  cashflow: number;
  txCount: number;
};

type Summary = {
  months: MonthBucket[];
  avgIncome: number;
  avgLivingSpend: number;
  avgDebtPayments: number;
  avgSpend: number;
  avgCashflow: number;
  totalTxCount: number;
};

const SECTION_KEY = "ta_active_section";
const HERO_MODE_KEY = "ta_dashboard_hero_mode";

type HeroMode = "wealth" | "cashflow";

/** Match next/link: left-click only; let modified clicks use the browser (new tab, etc.). */
function navigatePillarCard(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  router: { push: (url: string) => void },
) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (e.button !== 0) return;
  e.preventDefault();
  router.push(href);
}

export default function DashboardPage() {
  const {
    transactions,
    debtsComplete,
    manualMode,
    manualCashRows,
    trueFreeCashFlow,
    wealthLabUnlocked,
    pillar3MathClear,
    debtsBlockingPillar3,
    hardBlockDebtsNoCheat,
    debtsInCheatAprBand,
    riskPillarSlideUnlocked,
    setRiskPillarSlideUnlocked,
  } = useFinancial();

  const router = useRouter();
  const [debtUnlocked, setDebtUnlocked] = useState(false);
  const [cashflowComplete, setCashflowComplete] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [heroMode, setHeroMode] = useState<HeroMode>("wealth");

  const manualTotals = useMemo(
    () => manualCashRowTotals(manualCashRows),
    [manualCashRows],
  );

  const maxManualChartBar = useMemo(
    () =>
      Math.max(manualTotals.income, manualTotals.essential, manualTotals.discretionary, 1),
    [manualTotals],
  );

  /** Rolling six calendar month labels (newest on the right), same as Plaid chart order. */
  const manualSixMonthLabels = useMemo(() => {
    const d = new Date();
    const names = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const out: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push({
        key: `manual-${x.getFullYear()}-${x.getMonth()}`,
        label: names[x.getMonth()],
      });
    }
    return out;
  }, []);

  /** Plaid 6-mo average when linked; manual spreadsheet net when Manual mode is on. */
  const displayMonthlyCashflow = useMemo(() => {
    if (manualMode) return trueFreeCashFlow;
    if (summary && Number.isFinite(summary.avgCashflow)) return summary.avgCashflow;
    return trueFreeCashFlow;
  }, [manualMode, summary, trueFreeCashFlow]);

  const refineGlowEligible = useMemo(() => {
    const months = summary?.months?.length ?? 0;
    return months >= 4 && transactions.length >= 50;
  }, [summary, transactions]);

  const refinanceCheatGlow = useMemo(() => {
    if (pillar3MathClear) return false;
    if (hardBlockDebtsNoCheat.length > 0) return false;
    if (debtsInCheatAprBand.length === 0) return false;
    return refineGlowEligible;
  }, [
    pillar3MathClear,
    hardBlockDebtsNoCheat.length,
    debtsInCheatAprBand.length,
    refineGlowEligible,
  ]);

  useLayoutEffect(() => {
    try {
      const flags = loadUnlockFlags();
      setCashflowComplete(!!flags.cashflowComplete);
      setDebtUnlocked(!!flags.debtSlideUnlocked);

      const saved = localStorage.getItem(HERO_MODE_KEY);
      if (saved === "wealth" || saved === "cashflow") {
        setHeroMode(saved);
      }

      const lastSection = localStorage.getItem(SECTION_KEY);
      /** Do not auto-send to /calibration — section key set while on that page breaks “Continue to dashboard”. */
      if (lastSection === "cashflow" && flags.cashflowComplete) {
        router.replace("/cashflow");
        return;
      }
      if (lastSection === "debt" && flags.debtSlideUnlocked) {
        router.replace("/debt");
        return;
      }
    } finally {
      setHydrated(true);
    }
  }, [router]);

  useEffect(() => {
    if (!cashflowComplete) return;
    setSummaryLoading(true);
    fetch("/api/cashflow-summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSummary(data as Summary);
      })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [cashflowComplete]);

  const uncategorized = useMemo(
    () =>
      transactions.filter((t) => t.category === "uncategorized" && !t.debtPaymentSuggestion).length,
    [transactions],
  );

  const pendingDebtConfirms = useMemo(
    () => transactions.filter((t) => t.debtPaymentSuggestion).length,
    [transactions],
  );

  const cashflowPillarHref = useMemo(() => {
    if (!cashflowComplete) return "/intake";
    if (pendingDebtConfirms > 0) return "/cashflow#debt-payment-confirm";
    if (uncategorized > 0) return "/calibration";
    return "/cashflow";
  }, [cashflowComplete, pendingDebtConfirms, uncategorized]);

  const weeklyDeployUsd = useMemo(() => {
    if (manualMode) {
      return Math.round((trueFreeCashFlow / 4.33) * 100) / 100;
    }
    const monthly = summary?.avgCashflow;
    if (monthly != null && Number.isFinite(monthly)) {
      return Math.round((monthly / 4.33) * 100) / 100;
    }
    return Math.round((trueFreeCashFlow / 4.33) * 100) / 100;
  }, [manualMode, summary, trueFreeCashFlow]);

  const maxBar = useMemo(() => {
    if (!summary) return 1;
    return Math.max(
      ...summary.months.map((m) =>
        Math.max(m.income, m.spend, m.debtPayments ?? 0),
      ),
      1,
    );
  }, [summary]);

  const handleDebtUnlock = () => {
    setDebtUnlocked(true);
    saveUnlockFlags({ debtSlideUnlocked: true });
    localStorage.setItem(SECTION_KEY, "debt");
    router.push("/debt");
  };

  const handleRiskUnlock = () => {
    setRiskPillarSlideUnlocked(true);
    localStorage.setItem(SECTION_KEY, "risk");
    router.push("/coming-soon?feature=risk");
  };

  const setHeroTab = (mode: HeroMode) => {
    setHeroMode(mode);
    localStorage.setItem(HERO_MODE_KEY, mode);
  };

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-7 pt-2" aria-busy="true">
        <div className="h-36 animate-pulse rounded-3xl border border-slate-200/70 bg-slate-100/90 dark:border-white/[0.08] dark:bg-white/[0.06]" />
        <div className="h-52 animate-pulse rounded-3xl border border-slate-200/70 bg-slate-100/90 dark:border-white/[0.08] dark:bg-white/[0.06]" />
        <div className="h-40 animate-pulse rounded-3xl border border-slate-200/70 bg-slate-100/90 dark:border-white/[0.08] dark:bg-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 pt-2">
      {/* ── hero: investing deploy after Pillar 3 gate vs. cashflow snapshot ── */}
      {wealthLabUnlocked ? (
        <div>
          <div
            className="mb-4 flex rounded-2xl border border-white/[0.08] bg-black/[0.03] p-1 dark:bg-white/[0.04]"
            role="tablist"
            aria-label="Dashboard headline"
          >
            <button
              type="button"
              role="tab"
              aria-selected={heroMode === "cashflow"}
              onClick={() => setHeroTab("cashflow")}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-medium transition ${
                heroMode === "cashflow"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white"
                  : "text-slate-500 dark:text-white/45"
              }`}
            >
              Cash flow
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={heroMode === "wealth"}
              onClick={() => setHeroTab("wealth")}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-medium transition ${
                heroMode === "wealth"
                  ? "bg-emerald-500/20 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-100"
                  : "text-slate-500 dark:text-white/45"
              }`}
            >
              Wealth
            </button>
          </div>

          {heroMode === "wealth" ? (
            <>
              <p className="label-light mb-3 text-slate-400 dark:text-white/35">
                Wealth · deploy mode
              </p>
              {summaryLoading && !summary && !manualMode ? (
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400/50" />
                  <span className="text-sm font-light text-slate-500 dark:text-white/30">
                    Sizing deployable flow…
                  </span>
                </div>
              ) : (
                <>
                  <p
                    className={`numeral text-[clamp(2.5rem,8vw,4rem)] leading-none tracking-tighter ${
                      weeklyDeployUsd >= 0 ? "text-slate-900 dark:text-white" : "text-orange-400"
                    }`}
                  >
                    {weeklyDeployUsd < 0 ? "-" : "≈ "}$
                    {Math.abs(weeklyDeployUsd).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                    <span className="block text-[13px] font-light tracking-normal text-slate-500 dark:text-white/40">
                      per week (from deployed cash-flow math, not a budget pie chart)
                    </span>
                  </p>
                  <p className="mt-4 max-w-md text-[14px] font-light leading-relaxed text-slate-600 dark:text-white/45">
                    High-APR debt is cleared and Risk is unlocked—shift from defense to deployment. Partner
                    tools stay gated behind your progress, not banner ads on signup.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/products"
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-500/90 px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
                    >
                      Open partner lab
                    </Link>
                    <Link
                      href="/accounts"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/[0.1] px-5 py-3 text-[14px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-white/85 dark:hover:bg-white/10"
                    >
                      Accounts
                    </Link>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p className="label-light mb-3 text-slate-400 dark:text-white/35">
                Average Monthly Cashflow
              </p>
              {cashflowComplete && (manualMode || summary) ? (
                <>
                  <p
                    className={`numeral text-[clamp(2.5rem,8vw,4rem)] leading-none tracking-tighter ${
                      displayMonthlyCashflow >= 0 ? "text-slate-900 dark:text-white" : "text-orange-400"
                    }`}
                  >
                    {displayMonthlyCashflow < 0 ? "-" : ""}$
                    {Math.abs(displayMonthlyCashflow).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  {manualMode ? (
                    <p className="mt-3 text-sm font-light text-emerald-600 dark:text-emerald-300/70">
                      Manual budget (monthly) · edit lines in Settings
                    </p>
                  ) : (
                    <Link
                      href="/accounts"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-light text-emerald-600 underline decoration-emerald-600/30 underline-offset-2 transition hover:text-emerald-500 dark:text-emerald-300/70 dark:decoration-emerald-300/20 dark:hover:text-emerald-300"
                    >
                      6-month average · linked accounts
                    </Link>
                  )}
                </>
              ) : cashflowComplete && !manualMode && summaryLoading ? (
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400/50" />
                  <span className="text-sm font-light text-slate-500 dark:text-white/30">
                    Calculating averages…
                  </span>
                </div>
              ) : (
                <>
                  <p className="numeral text-[clamp(2.5rem,8vw,4rem)] leading-none tracking-tighter text-slate-400 dark:text-white/25">
                    $0
                  </p>
                  <p className="mt-3 text-sm font-light text-emerald-600 dark:text-emerald-300/70">
                    Complete the intake to calculate
                  </p>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          <p className="label-light mb-3 text-slate-400 dark:text-white/35">
            Average Monthly Cashflow
          </p>
          {cashflowComplete && (manualMode || summary) ? (
            <>
              <p
                className={`numeral text-[clamp(2.5rem,8vw,4rem)] leading-none tracking-tighter ${
                  displayMonthlyCashflow >= 0 ? "text-slate-900 dark:text-white" : "text-orange-400"
                }`}
              >
                {displayMonthlyCashflow < 0 ? "-" : ""}$
                {Math.abs(displayMonthlyCashflow).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </p>
              {manualMode ? (
                <p className="mt-3 text-sm font-light text-emerald-600 dark:text-emerald-300/70">
                  Manual budget (monthly) · edit lines in Settings
                </p>
              ) : (
                <Link
                  href="/accounts"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-light text-emerald-600 underline decoration-emerald-600/30 underline-offset-2 transition hover:text-emerald-500 dark:text-emerald-300/70 dark:decoration-emerald-300/20 dark:hover:text-emerald-300"
                >
                  6-month average · linked accounts
                </Link>
              )}
            </>
          ) : cashflowComplete && !manualMode && summaryLoading ? (
            <div className="flex items-center gap-2 pt-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400/50" />
              <span className="text-sm font-light text-slate-500 dark:text-white/30">
                Calculating averages…
              </span>
            </div>
          ) : (
            <>
              <p className="numeral text-[clamp(2.5rem,8vw,4rem)] leading-none tracking-tighter text-slate-400 dark:text-white/25">
                $0
              </p>
              <p className="mt-3 text-sm font-light text-emerald-600 dark:text-emerald-300/70">
                Complete the intake to calculate
              </p>
            </>
          )}
        </div>
      )}

      {/* ── 6-month overview: Plaid from API, or manual (same monthly profile × 6 — no per-month history yet) ── */}
      {cashflowComplete && manualMode && (
        <GlassCard>
          <div className="mb-4 flex items-baseline justify-between">
            <p className="text-[11px] font-light uppercase tracking-wider text-slate-400 dark:text-white/30">
              6-Month overview (manual)
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-light text-slate-500 dark:text-white/35">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400/60" />
                Income
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-orange-400/50" />
                Essential
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-amber-400/55" />
                Discretionary
              </span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            {manualSixMonthLabels.map((m) => {
              const incPct =
                maxManualChartBar > 0 ? (manualTotals.income / maxManualChartBar) * 100 : 0;
              const essPct =
                maxManualChartBar > 0 ? (manualTotals.essential / maxManualChartBar) * 100 : 0;
              const discPct =
                maxManualChartBar > 0 ? (manualTotals.discretionary / maxManualChartBar) * 100 : 0;
              return (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end justify-center gap-0.5">
                    <motion.div
                      className="w-2 rounded-t bg-emerald-400/60"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(incPct, 2)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                    <motion.div
                      className="w-2 rounded-t bg-orange-400/50"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(essPct, 2)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
                    />
                    <motion.div
                      className="w-2 rounded-t bg-amber-400/55"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(discPct, 2)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                  <span className="text-[9px] font-light text-slate-500 dark:text-white/30">{m.label}</span>
                  <span className="text-[8px] font-light text-slate-400 dark:text-white/20">avg / mo</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-right text-[9px] font-light leading-relaxed text-slate-500 dark:text-white/25">
            Settings lines are{" "}
            <span className="text-slate-700 dark:text-white/40">monthly</span>. We don&apos;t store six
            different months yet—each column uses the same profile, so the{" "}
            <span className="text-slate-700 dark:text-white/40">6-month average</span> matches those totals
            (like a flat trend).
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-4 dark:border-white/[0.06] sm:grid-cols-4">
            <div className="text-center">
              <p className="text-[10px] font-light text-slate-500 dark:text-white/35">Avg income / mo</p>
              <p className="numeral mt-0.5 text-[14px] font-semibold text-emerald-400/90">
                ${manualTotals.income.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-light text-slate-500 dark:text-white/35">Avg essential / mo</p>
              <p className="numeral mt-0.5 text-[14px] font-semibold text-orange-400/90">
                ${manualTotals.essential.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-light text-slate-500 dark:text-white/35">Avg discretionary / mo</p>
              <p className="numeral mt-0.5 text-[14px] font-semibold text-amber-400/85">
                ${manualTotals.discretionary.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-light text-slate-500 dark:text-white/35">Avg net / mo</p>
              <p
                className={`numeral mt-0.5 text-[14px] font-semibold ${
                  displayMonthlyCashflow >= 0 ? "text-emerald-400" : "text-orange-400"
                }`}
              >
                {displayMonthlyCashflow < 0 ? "-" : "+"}$
                {Math.abs(displayMonthlyCashflow).toLocaleString()}
              </p>
            </div>
          </div>
          {manualCashRows.length === 0 && (
            <p className="mt-3 text-xs font-light text-slate-600 dark:text-white/35">
              Add rows under Settings → Manual mode (income, essential, discretionary).
            </p>
          )}
        </GlassCard>
      )}
      {cashflowComplete && !manualMode && summary && summary.months.length > 0 && (
        <GlassCard>
          <div className="mb-4 flex items-baseline justify-between">
            <p className="text-[11px] font-light uppercase tracking-wider text-slate-400 dark:text-white/30">
              6-Month Overview
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-light text-slate-500 dark:text-white/35">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400/60" />
                Income
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-orange-400/50" />
                Living &amp; other
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-amber-400/55" />
                Debt payments
              </span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            {[...summary.months].reverse().map((m) => {
              const incPct = maxBar > 0 ? (m.income / maxBar) * 100 : 0;
              const livPct = maxBar > 0 ? (m.spend / maxBar) * 100 : 0;
              const debtPct = maxBar > 0 ? ((m.debtPayments ?? 0) / maxBar) * 100 : 0;
              return (
                <div
                  key={m.key}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div className="flex h-24 w-full items-end justify-center gap-0.5">
                    <motion.div
                      className="w-2 rounded-t bg-emerald-400/60"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(incPct, 2)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                    <motion.div
                      className="w-2 rounded-t bg-orange-400/50"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(livPct, 2)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
                    />
                    <motion.div
                      className="w-2 rounded-t bg-amber-400/55"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(debtPct, 2)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                  <span className="text-[9px] font-light text-slate-500 dark:text-white/30">
                    {m.label.split(" ")[0]}
                  </span>
                  <span className="text-[8px] font-light text-slate-400 dark:text-white/20">
                    {m.txCount} tx
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-2 text-right text-[9px] font-light text-slate-500 dark:text-white/20">
            {summary.totalTxCount} transactions from Plaid
          </p>

          {/* averages — income, living, debt, cashflow */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-4 dark:border-white/[0.06] sm:grid-cols-4">
            <div className="text-center">
              <p className="text-[10px] font-light text-slate-500 dark:text-white/35">Avg income</p>
              <p className="numeral mt-0.5 text-[14px] font-semibold text-slate-900 dark:text-white">
                ${summary.avgIncome.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-light text-slate-500 dark:text-white/35">Avg living &amp; other</p>
              <p className="numeral mt-0.5 text-[14px] font-semibold text-orange-400/90">
                ${(summary.avgLivingSpend ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-light text-slate-500 dark:text-white/35">Avg debt payments</p>
              <p className="numeral mt-0.5 text-[14px] font-semibold text-amber-400/90">
                ${(summary.avgDebtPayments ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-light text-slate-500 dark:text-white/35">Avg cashflow</p>
              <p
                className={`numeral mt-0.5 text-[14px] font-semibold ${
                  summary.avgCashflow >= 0 ? "text-emerald-400" : "text-orange-400"
                }`}
              >
                {summary.avgCashflow < 0 ? "-" : "+"}$
                {Math.abs(summary.avgCashflow).toLocaleString()}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── actions ── */}
      {!cashflowComplete && (
        <Link
          href="/intake"
          className="hit-44 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/90 py-4 text-[15px] font-semibold text-white transition active:scale-[0.97]"
        >
          Start Cash Flow Setup
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {/* ── pillar: cash flow ── */}
      <Link
        href={cashflowPillarHref}
        className="block"
        onClick={(e) => {
          if (cashflowComplete) {
            if (pendingDebtConfirms > 0) localStorage.setItem(SECTION_KEY, "cashflow");
            else if (uncategorized > 0) localStorage.setItem(SECTION_KEY, "calibration");
            else localStorage.setItem(SECTION_KEY, "cashflow");
          }
          navigatePillarCard(e, cashflowPillarHref, router);
        }}
      >
        <GlassCard className="transition hover:border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  cashflowComplete
                    ? "bg-emerald-500/15"
                    : "bg-white/[0.06]"
                }`}
              >
                {cashflowComplete ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-slate-400 dark:text-white/25" />
                )}
              </span>
              <div>
                <p className="text-[15px] font-semibold">Cash Flow</p>
                <p className="text-xs font-light text-slate-500 dark:text-white/40">
                  {cashflowComplete
                    ? pendingDebtConfirms > 0
                      ? `${pendingDebtConfirms} debt payment${pendingDebtConfirms === 1 ? "" : "s"} to confirm · Cash Flow`
                      : uncategorized === 0
                        ? "Stabilized · view details"
                        : `${uncategorized} in calibration queue`
                    : "Complete the intake to unlock"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 dark:text-white/20" />
          </div>
        </GlassCard>
      </Link>

      {/* ── pillar: debt ── */}
      {cashflowComplete && debtUnlocked ? (
        <Link
          href="/debt"
          className="block"
          onClick={(e) => {
            localStorage.setItem(SECTION_KEY, "debt");
            navigatePillarCard(e, "/debt", router);
          }}
        >
          <GlassCard className="transition hover:border-orange-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15">
                  <TrendingDown className="h-4 w-4 text-orange-400" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold">Debt Management</p>
                  <p className="text-xs font-light text-slate-500 dark:text-white/40">
                    {debtsComplete ? "Complete · view details" : "In progress · continue"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 dark:text-white/20" />
            </div>
          </GlassCard>
        </Link>
      ) : cashflowComplete ? (
        <GlassCard>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06]">
              <TrendingDown className="h-4 w-4 text-slate-400 dark:text-white/25" />
            </span>
            <div>
              <p className="text-[15px] font-semibold">Debt Management</p>
              <p className="text-xs font-light text-slate-500 dark:text-white/40">Slide to unlock</p>
            </div>
          </div>
          <div className="mt-4">
            <GlassSlideUnlock
              onUnlock={handleDebtUnlock}
              label="Slide to unlock Debt"
            />
          </div>
        </GlassCard>
      ) : (
        <div className="flex items-center justify-between rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 opacity-40 grayscale backdrop-blur-3xl">
          <span className="text-sm font-light">Debt Management</span>
          <Lock className="h-4 w-4 text-slate-400 dark:text-white/25" />
        </div>
      )}

      {/* Refinance / APR “cheat code” (shown while Level-1 APR debt remains) */}
      {cashflowComplete && debtUnlocked && !pillar3MathClear && (
        <RefinanceCheatCard
          cheatGlow={refinanceCheatGlow}
          blockingCount={debtsBlockingPillar3.length}
          hardBlockCount={hardBlockDebtsNoCheat.length}
          cheatBandCount={debtsInCheatAprBand.length}
        />
      )}

      {/* ── Pillar 3: Risk & protection (slide + gate) ── */}
      {!cashflowComplete ? (
        <div className="flex items-center justify-between rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 opacity-40 grayscale backdrop-blur-3xl">
          <span className="text-sm font-light">Risk &amp; protection</span>
          <Lock className="h-4 w-4 text-slate-400 dark:text-white/25" />
        </div>
      ) : !debtUnlocked ? (
        <div className="flex items-center justify-between rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 opacity-40 grayscale backdrop-blur-3xl">
          <span className="text-sm font-light">Risk &amp; protection</span>
          <Lock className="h-4 w-4 text-slate-400 dark:text-white/25" />
        </div>
      ) : !pillar3MathClear ? (
        <div className="relative z-50 flex items-center justify-between overflow-visible rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 opacity-40 grayscale backdrop-blur-3xl">
          <span className="text-sm font-light">Risk &amp; protection</span>
          <div className="relative flex shrink-0 items-center gap-1">
            <Pillar3GateHint />
            <Lock className="h-4 w-4 text-slate-400 dark:text-white/25" />
          </div>
        </div>
      ) : !riskPillarSlideUnlocked ? (
        <GlassCard>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15">
              <Shield className="h-4 w-4 text-violet-400" />
            </span>
            <div>
              <p className="text-[15px] font-semibold">Risk &amp; protection</p>
              <p className="text-xs font-light text-slate-500 dark:text-white/40">Slide to unlock</p>
            </div>
          </div>
          <div className="mt-4">
            <GlassSlideUnlock
              variant="violet"
              onUnlock={handleRiskUnlock}
              label="Slide to unlock Risk & protection"
            />
          </div>
        </GlassCard>
      ) : (
        <Link href="/coming-soon?feature=risk" className="block">
          <GlassCard className="border-white/[0.06] bg-white/[0.03] opacity-50 grayscale backdrop-blur-3xl transition hover:opacity-70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15">
                  <Shield className="h-4 w-4 text-violet-400" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold">Risk &amp; protection</p>
                  <p className="text-xs font-light text-slate-500 dark:text-white/40">Coming soon</p>
                </div>
              </div>
              <Lock className="h-4 w-4 text-slate-400 dark:text-white/25" />
            </div>
          </GlassCard>
        </Link>
      )}

      <div className="flex cursor-not-allowed items-center justify-between rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 opacity-50 grayscale backdrop-blur-3xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15">
            <ScrollText className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </span>
          <div>
            <p className="text-[15px] font-semibold">Tax efficiency</p>
            <p className="text-xs font-light text-slate-500 dark:text-white/40">Coming soon</p>
          </div>
        </div>
        <Lock className="h-4 w-4 text-slate-400 dark:text-white/25" />
      </div>

      <GlassCard className="cursor-not-allowed border-white/[0.06] bg-white/[0.03] opacity-50 grayscale backdrop-blur-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </span>
            <div>
              <p className="text-[15px] font-semibold">Wealth · Partner lab</p>
              <p className="text-xs font-light text-slate-500 dark:text-white/40">Coming soon</p>
            </div>
          </div>
          <Lock className="h-4 w-4 text-slate-400 dark:text-white/25" />
        </div>
      </GlassCard>

      <div className="flex cursor-not-allowed items-center justify-between rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 opacity-50 grayscale backdrop-blur-3xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15">
            <PiggyBank className="h-4 w-4 text-sky-500 dark:text-sky-400" />
          </span>
          <div>
            <p className="text-[15px] font-semibold">Retirement</p>
            <p className="text-xs font-light text-slate-500 dark:text-white/40">Coming soon</p>
          </div>
        </div>
        <Lock className="h-4 w-4 text-slate-400 dark:text-white/25" />
      </div>

      <div className="flex cursor-not-allowed items-center justify-between rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 opacity-50 grayscale backdrop-blur-3xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15">
            <ShieldCheck className="h-4 w-4 text-rose-500 dark:text-rose-400" />
          </span>
          <div>
            <p className="text-[15px] font-semibold">Legacy</p>
            <p className="text-xs font-light text-slate-500 dark:text-white/40">Coming soon</p>
          </div>
        </div>
        <Lock className="h-4 w-4 text-slate-400 dark:text-white/25" />
      </div>
    </div>
  );
}
