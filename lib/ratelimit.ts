import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null

/**
 * Returns an Upstash rate limiter instance.
 * Falls back to null (no rate limiting) if env vars are missing —
 * this lets the app run locally without Redis.
 */
export function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn('[ratelimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing — rate limiting disabled')
    return null
  }

  const redis = new Redis({ url, token })

  ratelimit = new Ratelimit({
    redis,
    // 30 requests per 60-second sliding window per user
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    analytics: true,
    prefix: 'kareerly:ratelimit',
  })

  return ratelimit
}

/**
 * Check rate limit for a given identifier (usually user ID or IP).
 * Returns { success, limit, remaining, reset } or null if rate limiting is disabled.
 */
export async function checkRateLimit(identifier: string) {
  const rl = getRatelimit()
  if (!rl) return { success: true, limit: 0, remaining: 0, reset: 0 }
  return rl.limit(identifier)
}
