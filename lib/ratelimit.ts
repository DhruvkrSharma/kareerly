// Rate limiting via Supabase Edge Functions

/**
 * Check rate limit for a given identifier (usually user ID or IP).
 * Returns { success, limit, remaining, reset }
 */
export async function checkRateLimit(identifier: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    console.warn('[ratelimit] NEXT_PUBLIC_SUPABASE_URL or ANON_KEY missing — rate limiting disabled')
    return { success: true, limit: 30, remaining: 30, reset: 0 }
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/rate-limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ identifier })
    })

    if (!res.ok) {
      console.warn('[ratelimit] Edge function failed, allowing request by default', await res.text())
      return { success: true, limit: 30, remaining: 30, reset: 0 }
    }

    const json = await res.json()
    return {
      success: json.success,
      limit: 30, // MAX_REQUESTS defined in Edge Function
      remaining: json.remaining,
      reset: json.reset
    }
  } catch (err) {
    console.warn('[ratelimit] Fetch to Edge Function failed:', err)
    return { success: true, limit: 30, remaining: 30, reset: 0 }
  }
}
