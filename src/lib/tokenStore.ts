import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { sealJson, unsealJson } from "@/lib/encryption";
import { hasPlaidItems } from "@/lib/plaidBundle";
import type { PlaidBundle } from "@/lib/types";

/**
 * Per-user encrypted Plaid token store.
 *
 * MVP: writes encrypted blobs to .data/<userId>.enc on disk.
 * Production: replace with Postgres/Prisma row per user, same
 * sealJson/unsealJson wrapping the access_token column.
 *
 * access_token NEVER leaves this module unencrypted.
 */

const DIR = join(process.cwd(), ".data", "plaid-tokens");

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}

function filePath(userId: string) {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(DIR, `${safe}.enc`);
}

export function getPlaidBundle(userId: string): PlaidBundle | null {
  ensureDir();
  const fp = filePath(userId);
  if (!existsSync(fp)) return null;
  const sealed = readFileSync(fp, "utf8");
  return unsealJson<PlaidBundle>(sealed);
}

/** Remove stored tokens entirely when nothing is linked (avoids stale empty blobs). */
export function deletePlaidBundle(userId: string): void {
  const fp = filePath(userId);
  if (existsSync(fp)) {
    try {
      unlinkSync(fp);
    } catch {
      /* ignore */
    }
  }
}

export function setPlaidBundle(userId: string, bundle: PlaidBundle): void {
  if (!hasPlaidItems(bundle)) {
    deletePlaidBundle(userId);
    return;
  }
  ensureDir();
  writeFileSync(filePath(userId), sealJson(bundle), "utf8");
}
