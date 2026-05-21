type Bucket = { tokens: number; updatedAt: number }

const CAPACITY = 10
const WINDOW_MS = 60 * 60 * 1000
const REFILL_PER_MS = CAPACITY / WINDOW_MS

const buckets = new Map<string, Bucket>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { tokens: CAPACITY, updatedAt: now }

  const elapsed = now - bucket.updatedAt
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsed * REFILL_PER_MS)
  bucket.updatedAt = now

  if (bucket.tokens < 1) {
    const needed = 1 - bucket.tokens
    const retryAfterSec = Math.ceil(needed / REFILL_PER_MS / 1000)
    buckets.set(key, bucket)
    return { allowed: false, remaining: 0, retryAfterSec }
  }

  bucket.tokens -= 1
  buckets.set(key, bucket)
  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    retryAfterSec: 0,
  }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  return req.headers.get("x-real-ip") ?? "unknown"
}
