"use client";

import type { SpendCategory, TxRow } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";
import { autoDetectCategory } from "@/lib/autoCategory";
import { useFinancial } from "@/context/FinancialContext";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";

const VAULT_CATS: SpendCategory[] = [
  "income", "groceries", "restaurants", "subscriptions",
  "transportation", "shopping", "entertainment", "transfer", "debt_payment", "other",
];

function DraggableCard({ tx }: { tx: TxRow }) {
  const { category: suggested } = useMemo(() => autoDetectCategory(tx), [tx]);
  const hasSuggestion = suggested !== "uncategorized";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tx.id,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="mx-auto w-[88%] cursor-grab touch-none rounded-2xl border border-white/15 bg-white/[0.08] px-6 py-6 text-center shadow-lg backdrop-blur-2xl active:cursor-grabbing"
    >
      {hasSuggestion && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">
          <span className="text-sm">{CATEGORY_META[suggested].emoji}</span>
          <span className="text-[11px] font-semibold text-emerald-400">
            {CATEGORY_META[suggested].label}?
          </span>
        </div>
      )}
      <p className="text-xl font-semibold tracking-tight">{tx.merchant}</p>
      <p className="numeral mt-1 text-2xl tracking-tighter">
        ${Math.abs(tx.amount).toFixed(2)}
      </p>
      <p className="mt-2 text-[10px] font-light text-white/30">Drag to a category</p>
    </div>
  );
}

function OverlayCard({ tx }: { tx: TxRow }) {
  return (
    <div className="w-72 rounded-2xl border border-white/20 bg-white/10 px-6 py-6 text-center shadow-2xl backdrop-blur-2xl">
      <p className="text-xl font-semibold text-white">{tx.merchant}</p>
      <p className="numeral mt-1 text-2xl text-white">${Math.abs(tx.amount).toFixed(2)}</p>
    </div>
  );
}

function DropVault({ id, cat }: { id: string; cat: SpendCategory }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const meta = CATEGORY_META[cat];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-2 py-4 backdrop-blur-xl transition-all duration-200 ${
        isOver
          ? "border-emerald-400/50 bg-emerald-400/10 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <span className="text-lg">{meta.emoji}</span>
      <p className="mt-1 text-[10px] font-semibold leading-tight">{meta.label}</p>
    </div>
  );
}

export function VaultMatch({
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const current = slice[index] as TxRow | undefined;

  const commit = useCallback(
    (cat: SpendCategory) => {
      if (!current) return;
      updateTxCategory(current.id, cat);
      const next = index + 1;
      setIndex(next);
      if (next >= slice.length) onComplete?.();
    },
    [current, index, slice.length, updateTxCategory, onComplete],
  );

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!event.over) return;
    const zone = event.over.id as string;
    const cat = zone.replace("vault-", "") as SpendCategory;
    if (CATEGORY_META[cat]) commit(cat);
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="text-4xl">&#10003;</div>
        <p className="text-sm font-light text-slate-600 dark:text-white/55">Vault round complete.</p>
      </div>
    );
  }

  return (
    <DndContext
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        {/* drop zones */}
        <div className="grid grid-cols-4 gap-2">
          {VAULT_CATS.map((cat) => (
            <DropVault key={cat} id={`vault-${cat}`} cat={cat} />
          ))}
        </div>

        {/* draggable card */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={current.id}
            initial={{ scale: 0.94, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
          >
            <DraggableCard tx={current} />
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-xs font-light tabular-nums text-slate-400 dark:text-white/30">
          {index + 1} / {slice.length}
        </p>
      </div>

      <DragOverlay>
        {activeId && current ? <OverlayCard tx={current} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
