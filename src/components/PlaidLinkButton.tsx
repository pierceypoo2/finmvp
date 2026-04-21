"use client";

import { usePlaidLink } from "react-plaid-link";
import { useCallback, useEffect, useState } from "react";

const env = (process.env.NEXT_PUBLIC_PLAID_ENV || "sandbox") as
  | "sandbox"
  | "development"
  | "production";

export type PlaidLinkSuccessPayload = { publicToken: string };

export function PlaidLinkButton({
  purpose,
  onSuccess,
  className,
  children,
}: {
  purpose: "credit" | "bank" | "loan";
  onSuccess: (payload: PlaidLinkSuccessPayload) => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/create_link_token?purpose=${purpose}`)
      .then((r) => r.json())
      .then((d) => setToken(d.link_token ?? null))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [purpose]);

  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      await fetch("/api/exchange_public_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token: publicToken, purpose }),
      });
      await Promise.resolve(onSuccess({ publicToken }));
    },
    [purpose, onSuccess],
  );

  const { open, ready } = usePlaidLink({
    token: token ?? "",
    onSuccess: onPlaidSuccess,
    env,
  });

  return (
    <button
      type="button"
      disabled={!ready || !token || loading}
      onClick={() => open()}
      className={
        className ??
        "w-full rounded-2xl border border-white/20 bg-white/50 px-6 py-4 text-sm font-semibold text-slate-900 backdrop-blur-xl transition active:scale-[0.97] disabled:opacity-40 dark:bg-white/10 dark:text-white"
      }
    >
      {loading ? "Preparing…" : children}
    </button>
  );
}
