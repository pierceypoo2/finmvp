"use client";

import type { SpendCategory, TxRow } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";
import { autoDetectCategory } from "@/lib/autoCategory";
import { useFinancial } from "@/context/FinancialContext";
import { springSnappy } from "@/lib/motion";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowDown, ArrowUp, Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const SWIPE_TH = 120;

const EXPENSE_CATEGORIES: SpendCategory[] = [
  "rent", "groceries", "restaurants", "travel",
  "subscriptions", "amazon", "transportation", "utilities",
  "shopping", "entertainment", "food", "health", "debt_payment", "other",
];

const INCOME_CATEGORIES: SpendCategory[] = ["income"];

const ALL_PICK_CATEGORIES: SpendCategory[] = [
  "income", "rent", "groceries", "restaurants", "travel",
  "subscriptions", "amazon", "transportation", "utilities",
  "shopping", "entertainment", "transfer", "food", "health", "debt_payment", "other",
];

type CardPhase = "type_question" | "category";

function SwipeCard({
  tx,
  onCommit,
}: {
  tx: TxRow;
  onCommit: (cat: SpendCategory) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [didDrag, setDidDrag] = useState(false);
  const [phase, setPhase] = useState<CardPhase>("category");
  const [chosenType, setChosenType] = useState<"income" | "expense" | null>(null);

  const { category: suggested, ambiguous } = useMemo(() => autoDetectCategory(tx), [tx]);
  const hasSuggestion = suggested !== "uncategorized";
  const isAmbiguous = ambiguous || tx.ambiguous;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const confirmOpacity = useTransform(x, [0, 80], [0, 1]);
  const skipOpacity = useTransform(x, [-80, 0], [1, 0]);
  const pickerOpacity = useTransform(y, [0, 60], [0, 1]);

  useEffect(() => {
    x.set(0);
    y.set(0);
    setDidDrag(false);
    setShowPicker(false);
    setChosenType(null);
    setPhase(isAmbiguous ? "type_question" : "category");
  }, [tx.id, x, y, isAmbiguous]);

  const handleIncomeChoice = useCallback(() => {
    setChosenType("income");
    onCommit("income");
  }, [onCommit]);

  const handleExpenseChoice = useCallback(() => {
    setChosenType("expense");
    setPhase("category");
    setShowPicker(true);
  }, []);

  const handleTransferChoice = useCallback(() => {
    onCommit("transfer");
  }, [onCommit]);

  const isTypeQuestion = phase === "type_question" && isAmbiguous && !chosenType;

  return (
    <>
      {/* side labels — only for category phase */}
      {!isTypeQuestion && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-between px-1">
          <motion.div
            style={{ opacity: skipOpacity }}
            className="flex flex-col items-center gap-1 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-4 backdrop-blur-sm"
          >
            <span className="text-[11px] font-semibold text-orange-400">Skip</span>
          </motion.div>
          {hasSuggestion && (
            <motion.div
              style={{ opacity: confirmOpacity }}
              className="flex flex-col items-center gap-1 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3 backdrop-blur-sm"
            >
              <Check className="h-5 w-5 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">
                {CATEGORY_META[suggested].emoji} {CATEGORY_META[suggested].label}
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* pick different indicator */}
      {!isTypeQuestion && (
        <motion.div
          style={{ opacity: pickerOpacity }}
          className="pointer-events-none absolute bottom-24 left-1/2 z-0 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl border border-slate-400/30 bg-slate-500/10 px-4 py-3 backdrop-blur-sm"
        >
          <ChevronDown className="h-4 w-4 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-400">Pick category</span>
        </motion.div>
      )}

      {/* main card */}
      <motion.div
        key={`${tx.id}-${phase}`}
        style={isTypeQuestion ? {} : { x, y, rotate }}
        drag={!isTypeQuestion && !showPicker}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.8}
        onDrag={(_, info) => {
          if (Math.abs(info.offset.x) > 10 || Math.abs(info.offset.y) > 10) {
            setDidDrag(true);
          }
        }}
        onDragEnd={() => {
          if (isTypeQuestion) return;
          const xv = x.get();
          const yv = y.get();
          if (xv > SWIPE_TH && hasSuggestion) {
            onCommit(suggested);
          } else if (xv < -SWIPE_TH) {
            onCommit("other");
          } else if (yv > 80) {
            setShowPicker(true);
          }
          if (xv <= SWIPE_TH && xv >= -SWIPE_TH && yv <= 80) {
            setTimeout(() => setDidDrag(false), 50);
          }
        }}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{
          x: !isTypeQuestion && x.get() > 50 ? 300 : !isTypeQuestion && x.get() < -50 ? -300 : 0,
          y: !isTypeQuestion && y.get() > 50 ? 300 : 0,
          opacity: 0,
          transition: { duration: 0.25 },
        }}
        onPointerUp={() => {
          if (isTypeQuestion) return;
          if (!didDrag && !showPicker) setShowPicker((s) => !s);
        }}
        className="relative z-10 w-[92%] cursor-grab touch-none rounded-3xl border shadow-2xl backdrop-blur-xl active:cursor-grabbing bg-white/60 border-white/40 text-slate-900 dark:bg-white/[0.12] dark:border-white/[0.15] dark:text-white"
      >
        <div className="px-7 pb-6 pt-7 text-center">
          {/* amount + merchant (always shown) */}
          <p className="numeral text-[2.25rem] leading-none tracking-tighter">
            ${Math.abs(tx.amount).toFixed(2)}
          </p>
          <p className="mt-3 text-lg font-semibold tracking-tight">
            {tx.merchant}
          </p>
          <p className="mt-2 text-xs font-light text-slate-400 dark:text-white/35">
            {tx.date}
            {tx.source && (
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                {tx.source}
              </span>
            )}
          </p>

          {/* ═══ PHASE: Income or Expense? ═══ */}
          {isTypeQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <p className="mb-5 text-[15px] font-medium">
                Is this money coming in or going out?
              </p>
              <div className="flex flex-col gap-2.5">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={handleIncomeChoice}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 py-3.5 text-[14px] font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                >
                  <ArrowDown className="h-4 w-4" />
                  Money coming in (income)
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={handleExpenseChoice}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-orange-400/20 bg-orange-500/10 py-3.5 text-[14px] font-semibold text-orange-400 transition hover:bg-orange-500/20"
                >
                  <ArrowUp className="h-4 w-4" />
                  Money going out (expense)
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={handleTransferChoice}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-[13px] font-medium text-white/50 transition hover:bg-white/[0.08]"
                >
                  Just a transfer between my accounts
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══ PHASE: Category (normal flow) ═══ */}
          {!isTypeQuestion && (
            <>
              {/* suggested badge */}
              {hasSuggestion && !showPicker && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">
                  <span className="text-sm">{CATEGORY_META[suggested].emoji}</span>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    {CATEGORY_META[suggested].label}
                  </span>
                </div>
              )}
              {!hasSuggestion && !showPicker && (
                <p className="mt-4 text-[13px] font-medium text-slate-500 dark:text-white/40">
                  What kind of {chosenType === "expense" ? "expense" : "transaction"} is this?
                </p>
              )}

              {/* category picker */}
              <AnimatePresence>
                {showPicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-white/[0.08] pt-5">
                      {(chosenType === "expense" ? EXPENSE_CATEGORIES : ALL_PICK_CATEGORIES).map(
                        (cat) => (
                          <motion.button
                            key={cat}
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onCommit(cat);
                            }}
                            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium transition hover:bg-white/15"
                          >
                            <span>{CATEGORY_META[cat].emoji}</span>
                            <span>{CATEGORY_META[cat].label}</span>
                          </motion.button>
                        ),
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!showPicker && (
                <p className="mt-5 text-[11px] font-light text-white/20">
                  {hasSuggestion
                    ? "Swipe right to confirm \u00b7 Tap to pick different"
                    : "Tap to pick a category"}
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

export function SwipeDeck({
  queue,
  limit,
  onComplete,
}: {
  queue: TxRow[];
  limit?: number;
  onComplete?: () => void;
}) {
  const { updateTxCategory } = useFinancial();
  const slice = limit != null ? queue.slice(0, limit) : queue;
  const [index, setIndex] = useState(0);
  const current = slice[index] as TxRow | undefined;
  const next1 = slice[index + 1] as TxRow | undefined;
  const next2 = slice[index + 2] as TxRow | undefined;

  const commit = useCallback(
    (cat: SpendCategory) => {
      if (!current) return;
      updateTxCategory(current.id, cat);
      const ni = index + 1;
      setIndex(ni);
      if (ni >= slice.length) onComplete?.();
    },
    [current, index, slice.length, updateTxCategory, onComplete],
  );

  /** Batch finished: `onComplete` already ran on the last commit — don’t call it again (was double-firing). */
  if (!current) {
    if (slice.length === 0) {
      return (
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <p className="text-sm font-light text-slate-500 dark:text-white/50">No cards in this batch.</p>
          {onComplete && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={springSnappy}
              onClick={onComplete}
              className="hit-44 rounded-2xl bg-emerald-500/90 px-10 py-4 text-[15px] font-semibold text-white transition"
            >
              Continue
            </motion.button>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="relative flex min-h-[520px] flex-col items-center">
      {/* ghost cards behind */}
      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        {next2 && (
          <div className="absolute w-[82%] scale-[0.88] rounded-3xl border border-white/[0.06] bg-white/[0.03] py-14 opacity-30 backdrop-blur-xl" />
        )}
        {next1 && (
          <div className="absolute w-[86%] scale-[0.94] rounded-3xl border border-white/[0.08] bg-white/[0.05] py-14 opacity-50 backdrop-blur-xl" />
        )}

        <AnimatePresence mode="popLayout">
          <SwipeCard key={current.id} tx={current} onCommit={commit} />
        </AnimatePresence>
      </div>

      {/* progress */}
      <p className="mt-4 text-xs font-light tabular-nums text-slate-400 dark:text-white/30">
        {index + 1} of {slice.length}
      </p>
    </div>
  );
}
