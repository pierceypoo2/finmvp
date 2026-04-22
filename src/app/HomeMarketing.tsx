"use client";

import { motion } from "framer-motion";
import { ArrowRight, Compass, Gift, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** Client-safe hint only (matches publishable-key check; no server secrets). */
const showDevHint =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("PASTE");

const SLIDE_COUNT = 4;

const slides = [
  {
    icon: Compass,
    headline: "What you're looking at",
    sub: "A calmer read on cash flow and debt—no scolding, no spreadsheet cosplay. Connect when you like, or use manual mode, and go at your own pace.",
    accent: "from-sky-400 to-indigo-500",
    bullets: [
      "Home: the snapshot and the longer view, when you have data.",
      "A natural path is intake → cash flow → debt—skip ahead if you already know the score.",
      "Points nudge progress; extra tools show up when the math makes sense, not to rush you.",
    ],
  },
  {
    icon: TrendingUp,
    headline: "Cash flow first, not guilt charts",
    sub: "Connect accounts and calibrate at your speed. The point is a clear story you can act on, not a pie chart to babysit.",
    accent: "from-emerald-400 to-cyan-400",
  },
  {
    icon: Sparkles,
    headline: "One step at a time",
    sub: "Cash flow, then debt, then wealth when you’re ready. Light milestones—not a guilt trip, not another evening lost to categories.",
    accent: "from-violet-400 to-indigo-400",
  },
  {
    icon: Gift,
    headline: "Partner tools, when you want them",
    sub: "Investing and advanced options stay out of the way until your numbers support them. No blinking signup walls—no pressure to look “ready enough.”",
    accent: "from-orange-400 to-rose-400",
  },
];

function readSlideIndex(el: HTMLDivElement): number {
  const w = Math.max(el.clientWidth, 1);
  const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
  let idx = Math.round(el.scrollLeft / w);
  if (maxScroll > 0 && el.scrollLeft >= maxScroll - 3) {
    idx = SLIDE_COUNT - 1;
  }
  return Math.min(SLIDE_COUNT - 1, Math.max(0, idx));
}

export function HomeMarketing() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const syncIndexFromScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = readSlideIndex(el);
    setCurrent((c) => (c !== idx ? idx : c));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    syncIndexFromScroll();
    const onResize = () => syncIndexFromScroll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncIndexFromScroll]);

  const scrollToSlide = useCallback((idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: idx * w, behavior: "smooth" });
    setCurrent(idx);
  }, []);

  const goNextOrApp = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = readSlideIndex(el);
    setCurrent(idx);

    if (idx >= SLIDE_COUNT - 1) {
      router.push("/dashboard");
      return;
    }
    scrollToSlide(idx + 1);
  }, [router, scrollToSlide]);

  const isLastSlide = current >= SLIDE_COUNT - 1;

  const skipToApp = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-auto fixed top-5 left-5 z-30">
        <Link
          href="/intro"
          className="text-[13px] font-light text-slate-500 underline decoration-slate-400/40 underline-offset-2 transition hover:text-slate-700 dark:text-white/40 dark:decoration-white/15 dark:hover:text-white/60"
        >
          Slower, fuller read
        </Link>
      </div>
      <div className="pointer-events-auto fixed top-12 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToSlide(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-6 bg-slate-900 dark:bg-white" : "w-2 bg-slate-400/40 dark:bg-white/25"
            }`}
          />
        ))}
      </div>

      <div
        ref={containerRef}
        onScroll={syncIndexFromScroll}
        className="min-h-0 flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide"
      >
        {slides.map((s, i) => (
          <div
            key={i}
            className="flex min-h-0 min-w-full shrink-0 snap-center snap-always flex-col items-center justify-center px-10 pb-4 text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true }}
              className={`mb-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${s.accent} shadow-2xl`}
            >
              <s.icon className="h-9 w-9 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="max-w-sm text-[clamp(1.75rem,6vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-slate-900 dark:text-white"
            >
              {s.headline}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="mt-5 max-w-xs text-[15px] font-light leading-relaxed text-slate-600 dark:text-white/50"
            >
              {s.sub}
            </motion.p>
            {"bullets" in s && s.bullets && s.bullets.length > 0 && (
              <ul className="mt-5 max-w-sm space-y-2.5 text-left text-[14px] font-light leading-snug text-slate-600 dark:text-white/50">
                {s.bullets.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/80" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="relative z-40 flex flex-col items-center gap-3 border-t border-slate-200/80 bg-white/80 px-8 pb-14 pt-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-slate-950/90">
        <button
          type="button"
          onClick={goNextOrApp}
          className="hit-44 flex w-full max-w-sm touch-manipulation items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white px-12 py-4 text-[15px] font-medium text-slate-800 shadow-sm transition active:scale-[0.99] dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-white"
        >
          {isLastSlide ? "Open the app" : "Next"}
          {!isLastSlide && <ArrowRight className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={skipToApp}
          className="text-[13px] font-light text-slate-500 underline-offset-2 transition hover:text-slate-700 dark:text-white/40 dark:hover:text-white/60"
        >
          Skip and go to the app
        </button>
        {showDevHint && (
          <p className="text-xs font-light text-amber-400/60">
            Dev mode — auth bypassed
          </p>
        )}
        <p className="mt-1 text-[11px] font-light text-slate-400 dark:text-white/25">
          Transparency Audit
        </p>
      </div>
    </div>
  );
}
