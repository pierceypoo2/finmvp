import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type WaitlistFeature = "risk" | "wealth" | "unknown";

export type WaitlistEntry = {
  feature: WaitlistFeature;
  email: string;
  userId: string;
  createdAt: string;
};

const DIR = join(process.cwd(), ".data", "waitlist");
const FILE = join(DIR, "waitlist.json");

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}

function safeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readAll(): WaitlistEntry[] {
  ensureDir();
  if (!existsSync(FILE)) return [];
  try {
    const raw = readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as WaitlistEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: WaitlistEntry[]) {
  ensureDir();
  writeFileSync(FILE, JSON.stringify(entries, null, 2), "utf8");
}

export function addToWaitlist(entry: Omit<WaitlistEntry, "createdAt">): { ok: true; already: boolean } {
  const entries = readAll();
  const email = safeEmail(entry.email);
  const feature = entry.feature ?? "unknown";

  const already = entries.some((e) => safeEmail(e.email) === email && e.feature === feature);
  if (already) return { ok: true, already: true };

  const next: WaitlistEntry = { ...entry, email, feature, createdAt: new Date().toISOString() };
  entries.push(next);
  writeAll(entries);
  return { ok: true, already: false };
}

