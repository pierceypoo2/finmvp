import type { AuditKind, SpendCategory, TxRow } from "@/lib/types";

const KEY = "transparency_audit_v2";
const MERCHANT_KEY = "ta_merchant_categories";

type AuditEntry = {
  audit?: AuditKind;
  category?: SpendCategory;
  isRent?: boolean;
  topicLabel?: string;
};

type AuditMap = Record<string, AuditEntry>;
type MerchantMap = Record<string, SpendCategory>;

function load(): AuditMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as AuditMap;
  } catch {
    return {};
  }
}

function save(map: AuditMap) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

function loadMerchantMap(): MerchantMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(MERCHANT_KEY) || "{}") as MerchantMap;
  } catch {
    return {};
  }
}

function saveMerchantMap(map: MerchantMap) {
  localStorage.setItem(MERCHANT_KEY, JSON.stringify(map));
}

export type CategoryLocks = { txIds: Set<string>; merchantKeys: Set<string> };

/** Transaction IDs and merchant keys the user has explicitly categorized — don’t auto-override. */
export function getCategoryLocks(): CategoryLocks {
  const idMap = load();
  const merchantMap = loadMerchantMap();
  const txIds = new Set<string>();
  for (const [id, e] of Object.entries(idMap)) {
    if (e?.category) txIds.add(id);
  }
  return { txIds, merchantKeys: new Set(Object.keys(merchantMap)) };
}

export function normalizeMerchantKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Merge persisted audits AND merchant-level categories onto fresh Plaid data.
 * Priority: transaction-ID audit > merchant-name memory > auto-category from API.
 */
export function mergeAudits(txs: TxRow[]): TxRow[] {
  const idMap = load();
  const merchantMap = loadMerchantMap();

  return txs.map((t) => {
    const byId = idMap[t.id];
    if (byId?.category) {
      return {
        ...t,
        audit: byId.audit ?? t.audit,
        category: byId.category,
        isRent: byId.isRent ?? t.isRent,
        topicLabel: byId.topicLabel ?? t.topicLabel,
        debtPaymentSuggestion: undefined,
      };
    }

    const key = normalizeMerchantKey(t.merchant);
    const merchantCat = merchantMap[key];
    if (merchantCat) {
      return {
        ...t,
        category: merchantCat,
        audit: byId?.audit ?? t.audit,
        isRent: byId?.isRent ?? t.isRent,
        topicLabel: byId?.topicLabel ?? t.topicLabel,
        debtPaymentSuggestion: undefined,
      };
    }

    if (byId) {
      return {
        ...t,
        audit: byId.audit ?? t.audit,
        isRent: byId.isRent ?? t.isRent,
        topicLabel: byId.topicLabel ?? t.topicLabel,
      };
    }

    return t;
  });
}

/**
 * Persist a category for a specific transaction ID AND remember the
 * merchant name → category mapping so future transactions from the
 * same merchant are auto-categorized.
 */
export function patchAudit(
  id: string,
  patch: { audit?: AuditKind; category?: SpendCategory; isRent?: boolean; topicLabel?: string },
  merchantName?: string,
) {
  const map = load();
  map[id] = { ...map[id], ...patch };
  save(map);

  if (patch.category && merchantName) {
    const merchantMap = loadMerchantMap();
    const key = normalizeMerchantKey(merchantName);
    merchantMap[key] = patch.category;
    saveMerchantMap(merchantMap);
  }
}
