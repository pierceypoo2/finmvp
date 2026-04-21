"use client";

import { GlassCard } from "@/components/GlassCard";
import {
  CHEAT_CODE_MAX_APR_PCT,
  PILLAR3_GATE_APR_PCT,
} from "@/lib/pillar3Gate";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import Link from "next/link";

type Props = {
  /** Enough history + no &gt;15% block + at least one account in (10%, 15%] — glowing “cheat code” state. */
  cheatGlow: boolean;
  blockingCount: number;
  /** Known APR above 15% — hide card (no partner refi story). */
  hardBlockCount: number;
  /** Count of balances strictly between gate and cheat cap (where a refi could apply). */
  cheatBandCount: number;
};

/**
 * B2B refinance hook: 10% gate for Pillar 3; cheat only in (10%, 15%]; above 15% — card hidden (see Pillar 3 gate).
 */
export function RefinanceCheatCard({
  cheatGlow,
  blockingCount,
  hardBlockCount,
  cheatBandCount,
}: Props) {
  if (blockingCount <= 0) return null;
  if (hardBlockCount > 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <GlassCard
        className={
          cheatGlow
            ? "border-violet-500/40 shadow-[0_0_32px_-4px_rgba(139,92,246,0.45)] dark:border-violet-400/35"
            : "border-white/[0.08]"
        }
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              cheatGlow ? "bg-violet-500/25 text-violet-100" : "bg-white/[0.06] text-white/50"
            }`}
          >
            {cheatGlow ? <Zap className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600/90 dark:text-violet-300/90">
              {cheatGlow ? "Cheat code signal" : "Break the APR gate"}
            </p>
            <p className="mt-1 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">
              {cheatGlow
                ? "Refinance may be available"
                : `Above ${PILLAR3_GATE_APR_PCT}% — clear the gate`}
            </p>
            <p className="mt-2 text-[13px] font-light leading-relaxed text-slate-600 dark:text-white/45">
              {cheatGlow ? (
                <>
                  Your payment history qualifies you for a partner refi on{" "}
                  {cheatBandCount === 1 ? "this account" : "these accounts"} in the{" "}
                  {PILLAR3_GATE_APR_PCT}–{CHEAT_CODE_MAX_APR_PCT}% band—drop the rate and you can satisfy the
                  Pillar 3 gate without years of sticker APR. Partner slots are gated; no junk-mail cards.
                </>
              ) : cheatBandCount > 0 ? (
                <>
                  You still have {cheatBandCount} balance{cheatBandCount === 1 ? "" : "s"} between{" "}
                  {PILLAR3_GATE_APR_PCT}% and {CHEAT_CODE_MAX_APR_PCT}% APR. Keep paying on time and link more
                  history—when you hit our signal threshold, the glowing refi cheat code can appear. Sub-{PILLAR3_GATE_APR_PCT}%
                  debt doesn&apos;t block the gate.
                </>
              ) : (
                <>
                  Add or confirm APR on every open balance, or pay down anything above{" "}
                  {PILLAR3_GATE_APR_PCT}%. Low-rate auto, many federal-style student loans, and mortgages at or
                  below the gate don&apos;t block Risk &amp; wealth tiers.
                </>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/debt"
                className="inline-flex rounded-xl bg-violet-600/90 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-violet-600 active:scale-[0.98] dark:bg-violet-500/80"
              >
                Review debt map
              </Link>
              {cheatGlow && (
                <span className="inline-flex items-center rounded-xl border border-violet-500/30 px-4 py-2.5 text-[12px] font-medium text-violet-200/90">
                  Partner refi (coming soon)
                </span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
