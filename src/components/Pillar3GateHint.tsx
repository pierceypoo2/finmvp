"use client";

import { CHEAT_CODE_MAX_APR_PCT, HIGH_APR_GATE_PCT } from "@/lib/pillar3Gate";
import { Info } from "lucide-react";

/**
 * Inline (i) control: click to expand why Pillar 3 stays locked (APR gate, 15% refi rule, low-rate pass-through).
 */
export function Pillar3GateHint() {
  return (
    <details className="relative z-[100] inline-block">
      <summary
        title="Why this step is locked"
        className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700 dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white/70 [&::-webkit-details-marker]:hidden"
      >
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        <span className="sr-only">Why this step is locked</span>
      </summary>
      <div
        className="absolute right-0 top-full z-[200] mt-2 w-[min(calc(100vw-2.5rem),20rem)] rounded-2xl border border-slate-300 bg-white p-3.5 text-left text-[13px] font-normal leading-relaxed text-slate-900 shadow-xl ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10"
        role="tooltip"
      >
        Clear every open balance where APR is over {HIGH_APR_GATE_PCT}% (or add an APR if unknown).
        Balances above {CHEAT_CODE_MAX_APR_PCT}% must be paid down—partner refi cheat codes never apply there.
        Between {HIGH_APR_GATE_PCT}% and {CHEAT_CODE_MAX_APR_PCT}%, a strong payment history can unlock a
        refi path from the dashboard. Standard low-rate auto and many mortgages at or below the gate
        don&apos;t block this tier.
      </div>
    </details>
  );
}
