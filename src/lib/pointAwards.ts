/** localStorage key — list of award ids already granted (append-only, idempotent). */
export const POINT_AWARD_IDS_KEY = "ta_point_award_ids";

/** FNV-1a–style id from arbitrary entropy (e.g. Plaid public_token or a batch key). */
export function stablePointAwardId(prefix: string, entropy: string): string {
  let h = 2166136261;
  for (let i = 0; i < entropy.length; i++) {
    h ^= entropy.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${prefix}:h_${(h >>> 0).toString(16)}`;
}

export function loadAwardedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(POINT_AWARD_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

/** Returns true if this id was newly recorded (caller should grant points). */
export function tryConsumePointAwardId(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const set = loadAwardedIds();
    if (set.has(id)) return false;
    set.add(id);
    localStorage.setItem(POINT_AWARD_IDS_KEY, JSON.stringify([...set]));
    return true;
  } catch {
    return false;
  }
}
