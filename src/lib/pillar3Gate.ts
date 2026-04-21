import type { DebtRow } from "@/lib/types";

/** Above this APR with a balance blocks Pillar 3 (Risk / wealth). Same as “clear the gate” in copy. */
export const PILLAR3_GATE_APR_PCT = 10;

/**
 * Partner “cheat code” refi is never offered above this APR — user must pay balances down.
 * Debts in (PILLAR3_GATE_APR_PCT, CHEAT_CODE_MAX_APR_PCT] may qualify when payment history is strong.
 */
export const CHEAT_CODE_MAX_APR_PCT = 15;

/** @deprecated Use PILLAR3_GATE_APR_PCT — kept for imports that meant “the % in UI strings”. */
export const HIGH_APR_GATE_PCT = PILLAR3_GATE_APR_PCT;

/** At or below = “efficient” debt for labeling (auto, many mortgages). */
export const EFFICIENT_APR_PCT = 6;

export function hasPositiveBalance(d: DebtRow): boolean {
  return Number.isFinite(d.balance) && d.balance > 0.5;
}

/**
 * Blocks Pillar 3: positive balance and (APR unknown OR APR > 10%).
 */
export function isBlockingHighAprDebt(d: DebtRow): boolean {
  if (!hasPositiveBalance(d)) return false;
  if (d.apr == null || !Number.isFinite(d.apr)) return true;
  return d.apr > PILLAR3_GATE_APR_PCT;
}

/** Known APR above 15%: no refinance cheat code; must pay down first. */
export function isHardBlockNoCheatDebt(d: DebtRow): boolean {
  return (
    hasPositiveBalance(d) &&
    d.apr != null &&
    Number.isFinite(d.apr) &&
    d.apr > CHEAT_CODE_MAX_APR_PCT
  );
}

/** Strictly between gate and cheat cap — only band where a partner refi “cheat” can apply. */
export function isCheatCodeAprBand(d: DebtRow): boolean {
  return (
    hasPositiveBalance(d) &&
    d.apr != null &&
    Number.isFinite(d.apr) &&
    d.apr > PILLAR3_GATE_APR_PCT &&
    d.apr <= CHEAT_CODE_MAX_APR_PCT
  );
}

export function pillar3MathClear(debts: DebtRow[]): boolean {
  return !debts.some(isBlockingHighAprDebt);
}

export function blockingHighAprDebts(debts: DebtRow[]): DebtRow[] {
  return debts.filter(isBlockingHighAprDebt);
}

export function hardBlockNoCheatDebts(debts: DebtRow[]): DebtRow[] {
  return debts.filter(isHardBlockNoCheatDebt);
}

export function cheatCodeAprBandDebts(debts: DebtRow[]): DebtRow[] {
  return debts.filter(isCheatCodeAprBand);
}

/**
 * 1 = paydown / no cheat (above 15% or unknown APR), 2 = refi band (10–15%], 3 = at or below gate (≤10%).
 */
export function debtThreatTier(d: DebtRow): 1 | 2 | 3 {
  if (!hasPositiveBalance(d)) return 3;
  if (d.apr == null || !Number.isFinite(d.apr)) return 1;
  if (d.apr > CHEAT_CODE_MAX_APR_PCT) return 1;
  if (d.apr > PILLAR3_GATE_APR_PCT) return 2;
  return 3;
}
