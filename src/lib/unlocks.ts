export type Section =
  | "fast_intake"
  | "reveal"
  | "dashboard"
  | "calibration"
  | "debt"
  | "post_debt";

export type UnlockInput = {
  bankLinked: boolean;
  creditLinked: boolean;
  fastSwipeDone: boolean;
  revealSeen: boolean;
  debtSlideUnlocked: boolean;
  debtsComplete: boolean;
  fastRevealDone: boolean;
  fullLinkageDone: boolean;
  /** New flow: cashflow wizard fully completed (both rounds + summary confirmed) */
  cashflowComplete: boolean;
  /** Pillar 3 (Risk & protection): slide completed after high-APR debt is cleared. */
  riskPillarSlideUnlocked: boolean;
};

export function deriveUnlocked(s: UnlockInput): Set<Section> {
  const out = new Set<Section>(["fast_intake"]);

  if (s.bankLinked && s.fastSwipeDone) {
    out.add("reveal");
  }

  if (s.revealSeen || s.fastRevealDone || s.cashflowComplete) {
    out.add("dashboard");
    out.add("calibration");
  }

  if (s.cashflowComplete && s.debtSlideUnlocked) {
    out.add("debt");
  }

  if (s.debtsComplete) {
    out.add("post_debt");
  }

  return out;
}

const LS_KEY = "ta_unlock_state";

export function loadUnlockFlags(): Partial<UnlockInput> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}") as Partial<UnlockInput>;
  } catch {
    return {};
  }
}

export function saveUnlockFlags(flags: Partial<UnlockInput>) {
  const merged = { ...loadUnlockFlags(), ...flags };
  localStorage.setItem(LS_KEY, JSON.stringify(merged));
}
