"use client";

import { GlassCard } from "@/components/GlassCard";
import { useFinancial } from "@/context/FinancialContext";
import { CHEAT_CODE_MAX_APR_PCT, HIGH_APR_GATE_PCT } from "@/lib/pillar3Gate";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";

export default function RiskPillarPage() {
  const { pillar3MathClear, debtsBlockingPillar3 } = useFinancial();

  return (
    <div className="flex flex-col gap-8 pt-2">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="hit-44 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-200/80 dark:text-white dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="label-light text-slate-400 dark:text-white/35">Pillar 3</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Risk &amp; protection
          </h1>
        </div>
      </div>

      <GlassCard className="py-8">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-violet-500 dark:text-violet-400" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Wealth preservation mode</p>
        </div>
        <p className="text-[14px] font-light leading-relaxed text-slate-600 dark:text-white/45">
          You crossed the gate: no remaining debt above {HIGH_APR_GATE_PCT}% APR with a balance (or unknown APR
          on open balances). Above {CHEAT_CODE_MAX_APR_PCT}% APR, the product treats balances as pay-down-only—no
          partner refi shortcut. Emergency fund, insurance fit, and downside planning land here next.
        </p>
        {!pillar3MathClear && (
          <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[13px] font-light text-amber-950 dark:text-amber-100/85">
            Heads up: you still have {debtsBlockingPillar3.length} account
            {debtsBlockingPillar3.length === 1 ? "" : "s"} over the APR gate—finish those before relying on
            this chapter.
          </p>
        )}
      </GlassCard>
    </div>
  );
}
