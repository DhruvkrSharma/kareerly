import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Rate Limit (White Box Testing)', () => {
  const originalEnv = process.env
  let globalFetch: typeof fetch

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    globalFetch = global.fetch
  })

  it('gracefully degrades when Supabase env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const { checkRateLimit } = await import('../../lib/ratelimit')
    const result = await checkRateLimit('test_user')
    
    expect(result.success).toBe(true)
    expect(result.limit).toBe(30)
  })

  it('calls Supabase Edge Function when env vars are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key'

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, remaining: 0, reset: 123456 })
    })

    const { checkRateLimit } = await import('../../lib/ratelimit')
    const result = await checkRateLimit('test_user')
    
    expect(global.fetch).toHaveBeenCalledWith(
      'https://fake-project.supabase.co/functions/v1/rate-limit',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.reset).toBe(123456)
    
    global.fetch = globalFetch
  })
})
