"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const accent = {
  emerald: { fill: "bg-emerald-500/15" },
  violet: { fill: "bg-violet-500/25" },
  orange: { fill: "bg-orange-500/20" },
} as const;

export function GlassSlideUnlock({
  onUnlock,
  label = "Slide to unlock",
  variant = "emerald",
}: {
  onUnlock: () => void;
  label?: string;
  variant?: keyof typeof accent;
}) {
  const x = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [unlocked, setUnlocked] = useState(false);
  const THUMB = 48;

  const maxDrag = useCallback(() => {
    const w = trackRef.current?.clientWidth ?? 320;
    return w - THUMB - 8;
  }, []);

  const progressOpacity = useTransform(x, [0, 100], [0.4, 0]);
  const fillWidth = useTransform(x, (v) => `${v + THUMB + 4}px`);

  const handleDragEnd = useCallback(() => {
    if (unlocked) return;
    const threshold = maxDrag() * 0.65;
    if (x.get() >= threshold) {
      setUnlocked(true);
      animate(x, maxDrag(), { duration: 0.2 });
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
      setTimeout(() => onUnlock(), 250);
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }, [maxDrag, onUnlock, unlocked, x]);

  return (
    <div
      ref={trackRef}
      className="relative mx-auto h-14 w-full max-w-md overflow-hidden rounded-full border border-white/20 bg-white/10 backdrop-blur-xl dark:border-white/15"
    >
      {/* fill bar */}
      <motion.div
        className={`absolute inset-y-0 left-0 rounded-full ${accent[variant].fill}`}
        style={{ width: fillWidth }}
      />

      {/* label */}
      <motion.div
        style={{ opacity: progressOpacity }}
        className="pointer-events-none flex h-14 items-center justify-center text-xs font-light text-slate-500 dark:text-white/40"
      >
        {label}
      </motion.div>

      {/* draggable thumb */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: maxDrag() }}
        dragElastic={0}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.94 }}
        className="absolute left-1 top-1 z-10 flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full border border-white/30 bg-white/50 text-slate-900 shadow-lg active:cursor-grabbing dark:bg-white/20 dark:text-white"
        role="slider"
        aria-label="Slide to unlock"
        tabIndex={0}
      >
        <ChevronRight className="h-5 w-5" />
      </motion.div>
    </div>
  );
}
