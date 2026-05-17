import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    console.log('[feed] returned', data?.length, 'cards for', user.id)
    return NextResponse.json({ data: data ?? [] })

  } catch (err) {
    console.error('[feed] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}