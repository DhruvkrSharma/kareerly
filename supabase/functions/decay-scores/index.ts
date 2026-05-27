// supabase/functions/decay-scores/index.ts
// Supabase Edge Function to decay recommendation scores over time

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  // Check authorization - this should ideally be triggered by a pg_cron or secure webhook
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Decay freshness score by 0.05 every day, minimum 0
    // 2. Adjust overall score based on new freshness
    const { data, error } = await supabaseClient.rpc('decay_recommendation_scores')

    if (error) {
      console.error('Error running decay function:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true, message: 'Scores decayed successfully' }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
