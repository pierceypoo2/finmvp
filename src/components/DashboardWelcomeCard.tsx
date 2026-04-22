"use client";

import { GlassCard } from "@/components/GlassCard";
import { dismissDashboardWelcome, isDashboardWelcomeDismissed } from "@/lib/appTourStorage";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/cn";
import { BookOpen, LayoutDashboard, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STEPS: { label: string; href: string; detail: string }[] = [
  { label: "Intake", href: "/intake", detail: "Link accounts or set manual numbers—only when you’re ready." },
  { label: "Cash Flow", href: "/cashflow", detail: "Income, living spend, and debt outflows; tidy categories on your timeline." },
  { label: "Debt", href: "/debt", detail: "Balances and APRs open up as the rest comes into focus—no race." },
  { label: "Accounts", href: "/accounts", detail: "See what’s linked and what feeds the numbers." },
];

export function DashboardWelcomeCard() {
  const { theme } = useTheme();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isDashboardWelcomeDismissed());
  }, []);

  if (dismissed) return null;

  const labelMuted = cn(
    "text-[12px] font-light leading-relaxed",
    theme === "dark" && "text-white/40",
    theme === "light" && "text-slate-500",
    theme === "sundown" && "text-amber-950/55",
  );

  const linkClass = cn(
    "text-[13px] font-medium underline decoration-emerald-600/30 underline-offset-2 transition hover:opacity-90",
    theme === "dark" && "text-emerald-300/90 decoration-emerald-300/20",
    theme === "light" && "text-emerald-700",
    theme === "sundown" && "text-amber-900/80 decoration-amber-800/25",
  );

  return (
    <GlassCard className="relative border-emerald-500/10 bg-emerald-500/[0.04] dark:border-emerald-400/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12">
            <LayoutDashboard className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
          </span>
          <div>
            <p className="text-[15px] font-semibold leading-snug">Where things live (optional)</p>
            <p className={cn("mt-1", labelMuted)}>
              This screen is a snapshot: big numbers, a 6-month strip when data is in, and cards for Cash flow, debt, and
              risk. They tend to make more sense in order—but nothing bad happens if you browse out of order.
            </p>
            <p className={cn("mt-3", labelMuted)}>
              <span className="font-medium text-slate-700 dark:text-white/55">Points</span> in the header are a gentle
              nudge, not a test. <span className="font-medium text-slate-700 dark:text-white/55">Settings</span> is manual
              mode and preferences. The wide layout shows a partner lab (later)—ignore it until you care.
            </p>
            <ul className="mt-4 space-y-2">
              {STEPS.map((s) => (
                <li key={s.href} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                  <Link href={s.href} className={linkClass}>
                    {s.label}
                  </Link>
                  <span className={cn("text-[12px] font-light", labelMuted)}>{s.detail}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/intro"
              className={cn("mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium", linkClass)}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Read the longer intro
            </Link>
            <button
              type="button"
              onClick={() => {
                dismissDashboardWelcome();
                setDismissed(true);
              }}
              className={cn(
                "mt-3 text-left text-[12px] font-medium text-slate-500 underline decoration-slate-400/30 underline-offset-2 transition hover:text-slate-700 dark:text-white/40 dark:decoration-white/15 dark:hover:text-white/65",
              )}
            >
              Got it—hide this
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissDashboardWelcome();
            setDismissed(true);
          }}
          className="hit-44 -m-1.5 shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-black/[0.04] hover:text-slate-600 dark:hover:bg-white/[0.08] dark:hover:text-white/70"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </GlassCard>
  );
}
