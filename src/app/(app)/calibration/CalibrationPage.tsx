"use client";

import { SwipeDeck } from "@/components/SwipeDeck";
import { VaultMatch } from "@/components/VaultMatch";
import { useFinancial } from "@/context/FinancialContext";
import { stablePointAwardId } from "@/lib/pointAwards";
import { POINTS } from "@/lib/pointsRules";
import { uncategorizedInDuplicateClusters } from "@/lib/txDuplicates";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const BATCH_SIZE = 5;

const SECTION_KEY = "ta_active_section";

export default function CalibrationPage() {
  const { transactions, awardPointsOnce } = useFinancial();

  useEffect(() => {
    localStorage.setItem(SECTION_KEY, "calibration");
  }, []);

  const queue = useMemo(
    () =>
      transactions.filter((t) => t.category === "uncategorized" && !t.debtPaymentSuggestion),
    [transactions],
  );

  const dupHintCount = useMemo(
    () => uncategorizedInDuplicateClusters(transactions),
    [transactions],
  );

  const [gameMode, setGameMode] = useState<"swipe" | "match">("swipe");

  const currentBatch = useMemo(() => queue.slice(0, BATCH_SIZE), [queue]);

  const batchKey = currentBatch.map((t) => t.id).join("|");

  const onBatchComplete = useCallback(() => {
    awardPointsOnce(stablePointAwardId("calibration_batch", batchKey), POINTS.CALIBRATION_BATCH);
    setGameMode((m) => (m === "swipe" ? "match" : "swipe"));
  }, [awardPointsOnce, batchKey]);

  const allDone = queue.length === 0;

  const handleContinueDashboard = useCallback(() => {
    localStorage.removeItem(SECTION_KEY);
    awardPointsOnce("milestone:calibration_queue_clear", POINTS.CALIBRATION_QUEUE_CLEAR);
  }, [awardPointsOnce]);

  return (
    <div className="flex flex-col gap-8 pt-2">
      <div>
        <p className="label-light mb-2 text-slate-400 dark:text-white/35">
          {gameMode === "swipe" ? "Quick calibration" : "Vault match"}
        </p>
        <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight">
          Calibrate your transactions
        </h1>
        <p className="mt-3 text-[15px] font-light leading-relaxed text-slate-500 dark:text-white/50">
          We auto-label using rules and what you&rsquo;ve already confirmed—fix the edge cases here
          so your cash-flow math stays honest.
        </p>
      </div>

      {dupHintCount > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[13px] font-light leading-relaxed text-amber-950 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100/90">
          <span className="font-medium text-amber-900 dark:text-amber-200">
            {dupHintCount} likely duplicate
            {dupHintCount === 1 ? "" : "s"}:
          </span>{" "}
          same day + same amount (often a double post or transfer pair). Confirm one merchant and
          we&rsquo;ll remember it for similar charges.
        </div>
      )}

      {allDone ? (
        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <p className="text-4xl">&#10003;</p>
          <p className="text-[15px] font-light text-slate-600 dark:text-white/55">
            Queue clear—calibration caught up.
          </p>
          <Link
            href="/dashboard"
            onClick={handleContinueDashboard}
            className="hit-44 inline-flex items-center justify-center rounded-2xl bg-emerald-500/90 px-10 py-4 text-[15px] font-semibold text-white transition active:scale-[0.97]"
          >
            Continue to dashboard
          </Link>
        </div>
      ) : gameMode === "swipe" ? (
        <SwipeDeck
          key={batchKey}
          queue={currentBatch}
          onComplete={onBatchComplete}
        />
      ) : (
        <VaultMatch
          key={batchKey}
          queue={currentBatch}
          onComplete={onBatchComplete}
        />
      )}
    </div>
  );
}
