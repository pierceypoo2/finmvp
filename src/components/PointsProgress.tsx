"use client";

import { motion } from "framer-motion";

export function PointsProgress({ points }: { points: number }) {
  const max = 2000;
  const pct = Math.min(100, (points / max) * 100);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-light text-slate-500 dark:text-white/40">Points</span>
        <span className="numeral text-sm">{points.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/40 dark:bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
