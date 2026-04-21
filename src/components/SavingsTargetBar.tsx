"use client";

import { motion } from "framer-motion";

export function SavingsTargetBar({ savingsRatePct }: { savingsRatePct: number | null }) {
  const target = 20;
  const display = savingsRatePct ?? 0;
  const fill = Math.min(100, Math.max(0, (display / target) * 100));

  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-light text-slate-500 dark:text-white/40">
          Savings vs 20% goal
        </span>
        <span className="numeral text-sm">
          {savingsRatePct == null ? "\u2014" : `${savingsRatePct.toFixed(1)}%`}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-200/40 dark:bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-cyan-400/70"
          initial={{ width: 0 }}
          animate={{ width: `${fill}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <p className="mt-2 text-[10px] font-light text-slate-400 dark:text-white/25">
        Aim to save at least 20% of take-home income.
      </p>
    </div>
  );
}
