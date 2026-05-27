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
    const { success, remaining, reset } = await checkRateLimit(`saved:${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(reset) } }
      )
    }

    // Query recommendations joined with jobs and companies
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        id,
        score,
        confidence,
        tier,
        swipe_action,
        swiped_at,
        jobs (
          id,
          title,
          location,
          remote_ok,
          salary_min,
          salary_max,
          apply_url,
          skills_required,
          companies (
            name,
            slug,
            logo_url
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('swiped', true)
      .in('swipe_action', ['save', 'apply'])
      .order('swiped_at', { ascending: false })

    if (error) {
      console.error('[saved] fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format output to be clean for the frontend
    const formatted = (data ?? []).map((item: any) => {
      const job = item.jobs
      const company = job?.companies
      return {
        rec_id: item.id,
        job_id: job?.id,
        title: job?.title || 'Unknown Role',
        company_name: company?.name || 'Unknown Company',
        company_slug: company?.slug || '',
        company_logo: company?.logo_url || null,
        location: job?.location || 'India',
        remote_ok: job?.remote_ok || false,
        score: Math.round(item.score * 100),
        confidence: item.confidence,
        tier: item.tier,
        swipe_action: item.swipe_action,
        swiped_at: item.swiped_at,
        apply_url: job?.apply_url || '#',
        skills: job?.skills_required || []
      }
    })

    return NextResponse.json({ data: formatted })
  } catch (err) {
    console.error('[saved] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
