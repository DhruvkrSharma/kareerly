import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit check
    const { success, remaining, reset } = await checkRateLimit(`swipe:${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(reset) } }
      )
    }

    const body = await req.json()
    const { job_id, rec_id, action, session_id } = body

    if (!job_id || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await supabase.from('swipe_events').insert({
      user_id: user.id,
      job_id,
      action,
      session_id: session_id ?? null,
    })

    if (rec_id > 0) {
      await supabase
        .from('recommendations')
        .update({ swiped: true, swiped_at: new Date().toISOString(), swipe_action: action })
        .eq('id', rec_id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[swipe]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
