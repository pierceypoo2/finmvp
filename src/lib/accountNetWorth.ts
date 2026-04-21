import type { LinkedAccount } from "@/lib/types";

/**
 * Plaid uses positive `balances.current` for amount owed on credit and loan accounts.
 * For a net-worth-style total, treat those as negative; cash-like accounts keep their sign.
 */
export function signedBalanceForNetWorth(a: LinkedAccount): number | null {
  if (a.balance == null || !Number.isFinite(a.balance)) return null;
  const t = (a.type || "").toLowerCase();
  if (t === "credit" || t === "loan") return -Math.abs(a.balance);
  return a.balance;
}

export function totalNetWorthBalance(accounts: LinkedAccount[]): number {
  let s = 0;
  for (const a of accounts) {
    const v = signedBalanceForNetWorth(a);
    if (v == null || !Number.isFinite(v)) continue;
    s += v;
  }
  return Math.round(s * 100) / 100;
}

export function formatUsdSigned(n: number, maximumFractionDigits = 0): string {
  const abs = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits });
  if (n < 0) return `-$${abs}`;
  return `$${abs}`;
}
