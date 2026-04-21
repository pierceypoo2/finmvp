"use client";

import { GlassCard } from "@/components/GlassCard";
import { useEffect } from "react";
import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Where “home” navigates when not retrying */
  variant: "root" | "app";
};

export function ErrorRecoveryUI({ error, reset, variant }: Props) {
  useEffect(() => {
    console.error("[Transparency Audit]", error);
  }, [error]);

  const homeHref = variant === "app" ? "/dashboard" : "/";
  const homeLabel = variant === "app" ? "Dashboard" : "Home";

  return (
    <div className="mx-auto flex min-h-[min(60dvh,520px)] w-full max-w-lg flex-col justify-center gap-6 px-5 py-12">
      <GlassCard>
        <p className="label-light mb-2 text-slate-400 dark:text-white/35">Something went wrong</p>
        <h1 className="text-xl font-semibold tracking-tight">We couldn&apos;t load this screen</h1>
        <p className="mt-3 text-sm font-light leading-relaxed text-slate-600 dark:text-white/55">
          This wasn&apos;t your fault. Try again, or go back and open the page once more — that usually
          clears it.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[11px] leading-snug text-orange-200/90">
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="mt-2 text-[10px] font-mono text-white/25">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="hit-44 flex flex-1 items-center justify-center rounded-2xl bg-emerald-500/90 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            Try again
          </button>
          <Link
            href={homeHref}
            className="hit-44 flex flex-1 items-center justify-center rounded-2xl border border-white/15 py-3 text-center text-sm font-light text-white/80 transition hover:bg-white/5"
          >
            {homeLabel}
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
