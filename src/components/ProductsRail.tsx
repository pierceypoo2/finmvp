"use client";

import { springSnappy } from "@/lib/motion";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";

const TEASERS = [
  { id: "invest", label: "Investing & brokerage", hint: "Robo + self-directed" },
  { id: "tax", label: "Tax & self-employment", hint: "Quarterlies & structure" },
  { id: "re", label: "Real assets", hint: "When the numbers fit" },
] as const;

export function ProductsRail() {
  return (
    <div className="sticky top-24 space-y-4">
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
        <Sparkles className="h-4 w-4 text-emerald-400/80" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40">
          Partner lab
        </p>
      </div>
      <p className="text-[11px] font-light leading-relaxed text-slate-500 dark:text-white/35">
        Coming soon. This lab isn’t part of the MVP yet.
      </p>
      <ul className="space-y-2 opacity-55 grayscale">
        {TEASERS.map((t) => (
          <li key={t.id}>
            <Link
              href="/coming-soon?feature=wealth"
              className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition hover:opacity-85"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-medium text-slate-900 dark:text-white/90">{t.label}</p>
                  <p className="mt-0.5 text-[10px] font-light text-slate-500 dark:text-white/35">
                    {t.hint}
                  </p>
                </div>
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <motion.div whileTap={{ scale: 0.98 }} transition={springSnappy}>
        <Link
          href="/coming-soon?feature=wealth"
          className="block rounded-xl bg-white/10 py-2.5 text-center text-[12px] font-medium text-white/80 opacity-60 grayscale transition hover:bg-white/15 hover:opacity-80"
        >
          Open full lab →
        </Link>
      </motion.div>
    </div>
  );
}
