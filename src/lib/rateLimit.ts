/**
 * In-memory sliding-window rate limiter (per process).
 * Production: replace with Redis/Upstash for multi-instance.
 */

const windows = new Map<string, number[]>();

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (windows.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= maxRequests) return false;

  timestamps.push(now);
  windows.set(key, timestamps);
  return true;
}
