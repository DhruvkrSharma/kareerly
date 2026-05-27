import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/ratelimit'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit check
    const { success, remaining, reset } = await checkRateLimit(`feed:${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(reset) } }
      )
    }

    // Ensure profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
      })
    }

    // Call get_feed function
    const { data, error } = await supabase.rpc('get_feed', {
      p_user_id: user.id,
      p_limit: 20,
    })

    if (error) {
      console.error('[feed] rpc error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If get_feed() returned results, use them
    if (data && data.length > 0) {
      console.log('[feed] returned', data.length, 'cards for', user.id)
      return NextResponse.json({ data })
    }

    // Fallback: query raw active jobs when no recommendations exist
    console.log('[feed] no recs, falling back to raw jobs for', user.id)
    const { data: fallbackJobs, error: fallbackError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        location,
        remote_ok,
        apply_url,
        skills_required,
        company_id,
        companies (
          name,
          logo_url
        )
      `)
      .eq('is_active', true)
      .order('scraped_at', { ascending: false })
      .limit(20)

    if (fallbackError) {
      console.error('[feed] fallback error:', fallbackError)
      return NextResponse.json({ data: [] })
    }

    // Map raw jobs into FeedCard shape
    const fallbackCards = (fallbackJobs ?? []).map((job: any, i: number) => ({
      rec_id: 0,
      job_id: job.id,
      title: job.title,
      company_name: job.companies?.name ?? 'Company',
      company_logo: job.companies?.logo_url ?? null,
      location: job.location,
      remote_ok: job.remote_ok ?? false,
      score: 0.5,
      confidence: 0.3,
      tier: 3,
      score_factors: {},
      apply_url: job.apply_url,
    }))

    console.log('[feed] fallback returned', fallbackCards.length, 'jobs')
    return NextResponse.json({ data: fallbackCards })

  } catch (err) {
    console.error('[feed] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}