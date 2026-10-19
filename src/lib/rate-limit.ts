/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Deliberately keyed by caller-supplied identifiers (wallet address, referral
 * code, admin identifier) — never by IP address — so the app records no
 * visitor network identity. On serverless/edge runtimes this is best-effort
 * per instance; primary DDoS protection is expected from the host (Cloudflare).
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterMs: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 }
  }

  existing.count += 1
  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfterMs: existing.resetAt - now }
  }
  return { ok: true, remaining: limit - existing.count, retryAfterMs: 0 }
}

/** Periodically drop expired buckets so the map cannot grow unbounded. */
export function pruneRateLimits(): void {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

if (typeof setInterval !== 'undefined') {
  const timer = setInterval(pruneRateLimits, 60_000)
  if (typeof timer === 'object' && 'unref' in timer) timer.unref()
}
