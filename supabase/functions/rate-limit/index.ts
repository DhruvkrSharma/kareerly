import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration
const WINDOW_MS = 60 * 1000 // 60 seconds
const MAX_REQUESTS = 30

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const { identifier } = await req.json()
    if (!identifier) {
      return new Response(JSON.stringify({ error: 'identifier required' }), { status: 400, headers })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Fallback to true if missing env (e.g. local without edge function secrets config)
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ success: true, remaining: 99, reset: 0 }), { headers })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Call Postgres RPC to handle atomic rate limit update
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_id: identifier,
      p_window_ms: WINDOW_MS,
      p_max_requests: MAX_REQUESTS
    })

    if (error) throw error

    const { success, remaining, reset } = data

    return new Response(JSON.stringify({ success, remaining, reset }), { headers })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
})
