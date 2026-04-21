/**
 * Plaid passes through `minimum_payment_amount` from the issuer; it can be low or stale.
 * For display and payoff math, blend with a typical regulatory-style floor:
 * at least $25, and at least interest + 1% of balance when APR is known.
 */
export function creditCardMinimumPaymentDisplay(
  balance: number,
  aprAnnualPct: number | undefined,
  plaidMinimum: number | null | undefined,
): number {
  const plaid = plaidMinimum ?? 0;
  if (balance <= 0) return Math.max(0, plaid);

  const apr = aprAnnualPct ?? 0;
  const monthlyRate = apr / 100 / 12;
  const interest = balance * monthlyRate;
  const onePercentPrincipal = balance * 0.01;
  const heuristic = Math.max(25, Math.ceil((interest + onePercentPrincipal) * 100) / 100);

  if (plaid <= 0) return heuristic;
  return Math.max(plaid, heuristic);
}
