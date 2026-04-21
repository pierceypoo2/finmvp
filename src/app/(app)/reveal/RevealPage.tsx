"use client";

import { GlassCard } from "@/components/GlassCard";
import { useFinancial } from "@/context/FinancialContext";
import {
  estimatedDebtPayments30d,
  estimatedIncome30d,
  estimatedSpend30d,
  estimatedTotalOutflows30d,
  essentialVsDiscretionary,
  forCashflowWindow,
} from "@/lib/cashflow";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";

export default function RevealPage() {
  const { transactions, trueFreeCashFlow } = useFinancial();
  const neg = trueFreeCashFlow < 0;

  const txRoll = useMemo(() => forCashflowWindow(transactions, null), [transactions]);
  const income = useMemo(() => estimatedIncome30d(txRoll), [txRoll]);
  const livingSpend = useMemo(() => estimatedSpend30d(txRoll), [txRoll]);
  const debtPayments = useMemo(() => estimatedDebtPayments30d(txRoll), [txRoll]);
  const totalOutflows = useMemo(() => estimatedTotalOutflows30d(txRoll), [txRoll]);
  const { essential } = useMemo(() => essentialVsDiscretionary(txRoll), [txRoll]);

  return (
    <div className="flex flex-col gap-10 pt-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, filter: "blur(16px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <GlassCard className="py-10">
          <p className="label-light mb-6 text-center text-slate-400 dark:text-white/35">
            Your Cash Flow
          </p>

          <div className="space-y-3 px-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-medium">Monthly Income</span>
              <span className="numeral text-lg font-semibold">
                ${income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-medium">Living &amp; other spending</span>
              <span className="numeral text-lg font-semibold">
                ${livingSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-medium">Debt payments</span>
              <span className="numeral text-lg font-semibold">
                ${debtPayments.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-light text-slate-400 dark:text-white/35">
                Total outflows
              </span>
              <span className="numeral text-sm font-light text-slate-400 dark:text-white/35">
                ${totalOutflows.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-light text-slate-400 dark:text-white/35">
                Essential spending
              </span>
              <span className="numeral text-sm font-light text-slate-400 dark:text-white/35">
                ${essential.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="border-t border-white/[0.08] pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-semibold">Total Cashflow</span>
                <span className={`numeral text-3xl font-bold tracking-tighter ${neg ? "text-orange-400" : "text-emerald-400"}`}>
                  {neg ? "-" : ""}${Math.abs(trueFreeCashFlow).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {neg && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <GlassCard>
            <p className="text-[15px] font-medium leading-snug">
              Your monthly burn rate is running a little hot.
            </p>
            <p className="mt-3 text-sm font-light leading-relaxed text-slate-500 dark:text-white/45">
              Let&rsquo;s find $50 to cut this week &mdash; we&rsquo;ll use your
              categories to suggest where.
            </p>
          </GlassCard>
        </motion.div>
      )}

      <Link
        href="/dashboard"
        className="hit-44 flex items-center justify-center rounded-2xl bg-emerald-500/90 py-4 text-[15px] font-semibold text-white transition active:scale-[0.97]"
      >
        Continue to dashboard
      </Link>
    </div>
  );
}
