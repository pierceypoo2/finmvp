import type { PlaidBundle, PlaidTokenSlot } from "@/lib/types";

/**
 * Single store for all Plaid Items. New saves use only `items`.
 * Legacy `credit` / `bank` / `extra` are merged on read until migrated.
 */
export function allPlaidItems(bundle: PlaidBundle | null | undefined): PlaidTokenSlot[] {
  if (!bundle) return [];
  const seen = new Set<string>();
  const out: PlaidTokenSlot[] = [];
  const push = (slot: PlaidTokenSlot | undefined) => {
    if (!slot?.item_id || !slot?.access_token) return;
    if (seen.has(slot.item_id)) return;
    seen.add(slot.item_id);
    out.push(slot);
  };
  for (const s of bundle.items ?? []) push(s);
  push(bundle.credit);
  push(bundle.bank);
  for (const s of bundle.extra ?? []) push(s);
  return out;
}

export function hasPlaidItems(bundle: PlaidBundle | null | undefined): boolean {
  return allPlaidItems(bundle).length > 0;
}

/** Persist shape: only `items` (caller merges/replaces slots as needed). */
export function bundleWithItems(items: PlaidTokenSlot[]): PlaidBundle {
  return { items };
}
