"use client";

import { GlassCard } from "@/components/GlassCard";
import { useFinancial } from "@/context/FinancialContext";
import { HIGH_APR_GATE_PCT } from "@/lib/pillar3Gate";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import Link from "next/link";

const PLACEHOLDER_PARTNERS = [
  {
    title: "Indexed & robo allocation",
    body: "Placeholder for a B2B integration—only shown after you clear the debt gate. No affiliate banners in the core app.",
    tag: "Wealth",
  },
  {
    title: "Self-employment & quarterlies",
    body: "Structural tax checks for 1099 flows—ships when Pillar 4 logic lands in the product.",
    tag: "Tax",
  },
  {
    title: "Alternative & real-asset platforms",
    body: "Syndications and RE tools stay dark until risk and liquidity scores say go.",
    tag: "Risk",
  },
] as const;

export default function ProductsPage() {
  const { wealthLabUnlocked } = useFinancial();
  const unlocked = wealthLabUnlocked;

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
          <p className="label-light text-slate-400 dark:text-white/35">Partner lab</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Products
          </h1>
        </div>
      </div>

      {!unlocked ? (
        <GlassCard className="border-white/10 py-10 text-center">
          <Lock className="mx-auto h-10 w-10 text-white/25" />
          <p className="mt-4 text-[15px] font-medium text-slate-800 dark:text-white/90">
            Locked until Pillar 3 opens
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[14px] font-light leading-relaxed text-slate-500 dark:text-white/45">
            Zero out debt above {HIGH_APR_GATE_PCT}% APR (or fix missing APRs), unlock Risk with the slide on your
            dashboard, then this lab opens—not a credit card banner on day one.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-2xl bg-emerald-500/90 px-6 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
          >
            Back to dashboard
          </Link>
        </GlassCard>
      ) : (
        <>
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-[13px] font-light leading-relaxed text-emerald-950 dark:border-emerald-400/15 dark:bg-emerald-500/10 dark:text-emerald-100/85">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400/90" />
            <span>
              <span className="font-medium text-emerald-900 dark:text-emerald-200">Rewarded access.</span>{" "}
              These slots are for future integrations—shown here because you cleared the gate, not because
              a lender paid for placement.
            </span>
          </div>

          <div className="space-y-4">
            {PLACEHOLDER_PARTNERS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
              >
                <GlassCard className="py-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/70">
                    {p.tag}
                  </p>
                  <p className="mt-1 text-[17px] font-semibold text-slate-900 dark:text-white">{p.title}</p>
                  <p className="mt-2 text-[14px] font-light leading-relaxed text-slate-500 dark:text-white/45">
                    {p.body}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
