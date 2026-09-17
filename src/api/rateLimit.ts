/**
 * In-memory rate limiter for hackathon demo safety.
 * Resets on API restart — fine for single-process :8787. Document as such.
 */
type Entry = { at: number; count: number };

const buckets = new Map<string, Entry>();

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucketKey = key.toLowerCase();
  let entry = buckets.get(bucketKey);

  if (!entry || now - entry.at >= windowMs) {
    entry = { at: now, count: 0 };
    buckets.set(bucketKey, entry);
  }

  if (entry.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.at + windowMs - now) / 1000));
    return { ok: false, retryAfterSec, remaining: 0 };
  }

  entry.count += 1;
  const remaining = limit - entry.count;
  const retryAfterSec = Math.max(1, Math.ceil((entry.at + windowMs - now) / 1000));
  return { ok: true, retryAfterSec, remaining };
}

/** Drop stale buckets so Map does not grow forever. */
export function pruneRateLimits(windowMs: number) {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (now - v.at > windowMs * 4) buckets.delete(k);
  }
}

/** Best-effort client IP from Hono context headers. */
export function clientIp(getHeader: (name: string) => string | undefined): string {
  const xff = getHeader("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return getHeader("x-real-ip") || getHeader("cf-connecting-ip") || "local";
}
