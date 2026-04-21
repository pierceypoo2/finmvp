"use client";

import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type FeatureKey = "risk" | "wealth" | "tax" | "legacy";

function getCopy(feature: FeatureKey | null) {
  if (feature === "risk") {
    return {
      eyebrow: "Pillar 3",
      title: "Risk & protection",
      body: "This chapter is being rebuilt for the MVP. Insurance fit, emergency fund targets, and downside planning land here next.",
    };
  }

  if (feature === "wealth") {
    return {
      eyebrow: "Wealth",
      title: "Partner lab",
      body: "This lab is intentionally not part of the MVP. When it ships, it will be tools and integrations—no banner ads, no spam.",
    };
  }

  if (feature === "tax") {
    return {
      eyebrow: "Tax",
      title: "Tax efficiency",
      body: "Not in the MVP yet. This will cover W‑2 vs 1099 strategy, quarterly planning, and the highest-impact, lowest-regret tax moves.",
    };
  }

  if (feature === "legacy") {
    return {
      eyebrow: "Legacy",
      title: "Legacy",
      body: "Not in the MVP yet. This will cover beneficiaries, life planning docs, and long-term protection checkpoints.",
    };
  }

  return {
    eyebrow: "MVP",
    title: "Coming soon",
    body: "This section is not included in the MVP yet.",
  };
}

export default function ComingSoonClient() {
  const params = useSearchParams();
  const feature = (params.get("feature") as FeatureKey | null) ?? null;
  const copy = getCopy(feature);
  const [email, setEmail] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState<null | "joined" | "already">(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const featureKey = useMemo(
    () =>
      feature === "risk"
        ? "risk"
        : feature === "wealth"
          ? "wealth"
          : feature === "tax"
            ? "tax"
            : feature === "legacy"
              ? "legacy"
              : "unknown",
    [feature],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setJoinError(null);
      setJoined(null);

      try {
        const res = await fetch("/api/me", { method: "GET" });
        const json = (await res.json().catch(() => null)) as { email?: string | null } | null;
        const next = typeof json?.email === "string" ? json.email : null;
        if (!cancelled) setEmail(next);
      } catch {
        if (!cancelled) setEmail(null);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [featureKey]);

  return (
    <div className="flex flex-col gap-8 pt-2">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="hit-44 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-200/80 dark:text-white dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="label-light text-slate-400 dark:text-white/35">{copy.eyebrow}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <GlassCard className="py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Sparkles className="h-7 w-7 text-emerald-600 dark:text-emerald-400/90" />
          </div>
          <p className="mt-4 text-[16px] font-semibold text-slate-900 dark:text-white">Coming soon</p>
          <p className="mx-auto mt-2 max-w-sm text-[14px] font-light leading-relaxed text-slate-600 dark:text-white/45">
            {copy.body}
          </p>

          <div className="mx-auto mt-5 max-w-sm">
            <button
              type="button"
              disabled={!email || joining || joined !== null}
              onClick={async () => {
                if (!email) return;
                setJoining(true);
                setJoinError(null);
                try {
                  const res = await fetch("/api/waitlist", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ feature: featureKey, email }),
                  });
                  const json = (await res.json().catch(() => null)) as {
                    ok?: boolean;
                    already?: boolean;
                    error?: string;
                  } | null;
                  if (!res.ok || !json?.ok) throw new Error(json?.error || "WAITLIST_FAILED");
                  setJoined(json.already ? "already" : "joined");
                } catch (err) {
                  setJoinError(err instanceof Error ? err.message : "WAITLIST_FAILED");
                } finally {
                  setJoining(false);
                }
              }}
              className="inline-flex w-full justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-[14px] font-semibold text-slate-900 transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:text-white"
            >
              {joined === "joined"
                ? "Added to waitlist"
                : joined === "already"
                  ? "Already on the waitlist"
                  : joining
                    ? "Joining waitlist…"
                    : email
                      ? `Join waitlist (${email})`
                      : "Join waitlist (sign in)"}
            </button>
            {joinError && (
              <p className="mt-2 text-[12px] font-light text-rose-700 dark:text-rose-300/80">
                Couldn’t join waitlist. ({joinError})
              </p>
            )}
            {!email && (
              <p className="mt-2 text-[12px] font-light text-slate-500 dark:text-white/35">
                Sign in to join automatically with your Clerk email.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              href="/debt"
              className="inline-flex w-full justify-center rounded-2xl bg-emerald-500/90 px-6 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98] sm:w-auto"
            >
              Go to Debt (MVP) →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex w-full justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-[14px] font-semibold text-slate-900 transition hover:bg-white/10 active:scale-[0.98] dark:text-white sm:w-auto"
            >
              Back to dashboard
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

