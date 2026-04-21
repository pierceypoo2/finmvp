"use client";

import { useMemo } from "react";

type Props = {
  /** Balance at month 0, 1, … until payoff (or stall). */
  balances: number[];
  /** Cumulative interest charged, same length as balances (from amortization). */
  cumulativeInterest?: number[];
  className?: string;
};

function fmtInterest(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Compact balance-over-time chart for a single debt (slider payment scenario).
 * Optional red line: cumulative interest paid over the same horizon.
 */
export function DebtPayoffTimeline({ balances, cumulativeInterest, className }: Props) {
  const { balanceLine, interestLine, totalInterest } = useMemo(() => {
    if (balances.length < 2) {
      return { balanceLine: null as string | null, interestLine: null as string | null, totalInterest: 0 };
    }

    const int =
      cumulativeInterest &&
      cumulativeInterest.length === balances.length &&
      cumulativeInterest.length >= 2
        ? cumulativeInterest
        : null;

    const maxBal = Math.max(...balances, 1);
    const maxInt = int ? Math.max(...int, 0) : 0;
    const maxY = Math.max(maxBal, maxInt, 1);
    const totalInterest = int ? int[int.length - 1] ?? 0 : 0;

    const w = 100;
    const h = 36;
    const pad = 2;
    const innerH = h - pad * 2;

    const balanceLine = balances
      .map((bal, i) => {
        const x = pad + (i / (balances.length - 1)) * (w - pad * 2);
        const y = pad + (1 - bal / maxY) * innerH;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

    const interestLine = int
      ? int
          .map((cum, i) => {
            const x = pad + (i / (int.length - 1)) * (w - pad * 2);
            const y = pad + (1 - cum / maxY) * innerH;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(" ")
      : null;

    return { balanceLine, interestLine, totalInterest };
  }, [balances, cumulativeInterest]);

  if (!balanceLine) {
    return (
      <div
        className={`flex h-9 items-center text-[10px] font-light text-slate-500 dark:text-white/25 ${className ?? ""}`}
      >
        Timeline unavailable for this payment
      </div>
    );
  }

  return (
    <div className={className}>
      <svg
        viewBox="0 0 100 36"
        className="h-9 w-full"
        preserveAspectRatio="none"
        aria-label={
          interestLine
            ? `Balance and interest: total interest about ${fmtInterest(totalInterest)}`
            : "Balance over time until payoff"
        }
        role="img"
      >
        {interestLine && (
          <polyline
            fill="none"
            stroke="rgb(220 38 38)"
            className="dark:stroke-red-400/90"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={interestLine}
          />
        )}
        <polyline
          fill="none"
          stroke="currentColor"
          className="text-emerald-600 dark:text-emerald-400/85"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={balanceLine}
        />
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[9px] font-light text-slate-500 dark:text-white/25">
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-3 rounded-full bg-emerald-600 dark:bg-emerald-400/85" aria-hidden />
            Balance
          </span>
          {interestLine && (
            <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400/90">
              <span className="h-0.5 w-3 rounded-full bg-red-600 dark:bg-red-400/90" aria-hidden />
              Interest paid
            </span>
          )}
        </span>
        <span className="tabular-nums text-slate-600 dark:text-white/45">
          <span className="text-slate-500 dark:text-white/30">Now</span>
          <span className="mx-1.5">·</span>
          <span className="text-slate-500 dark:text-white/30">Payoff</span>
        </span>
      </div>
      {interestLine && (
        <p className="mt-1 text-[10px] tabular-nums text-red-800 dark:text-red-300/95">
          Total interest (scenario): <span className="font-medium">{fmtInterest(totalInterest)}</span>
        </p>
      )}
    </div>
  );
}
