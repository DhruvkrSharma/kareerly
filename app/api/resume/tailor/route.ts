import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/ratelimit'
import Groq from 'groq-sdk'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit check - stricter for AI generation (5 per hour)
    const { success, remaining, reset } = await checkRateLimit(`resume:${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for resume generation. Please try again later.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(reset) } }
      )
    }

    const body = await req.json()
    const { job_id } = body

    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 2. Fetch job details
    const { data: job } = await supabase
      .from('jobs')
      .select(`*, companies(name)`)
      .eq('id', job_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // 3. Setup Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    
    // 4. Generate Resume
    const prompt = `
You are an expert technical resume writer and ATS Analyzer. Your task is to tailor a candidate's resume specifically for a target job.

Candidate Profile:
- Full Name: ${profile.full_name || 'Candidate'}
- Skills: ${profile.skills?.join(', ') || 'N/A'}
- Experience: ${profile.experience_years || 0} years
- Preferred Roles: ${profile.preferred_roles?.join(', ') || 'N/A'}

Target Job:
- Title: ${job.title}
- Company: ${job.companies?.name || 'Company'}
- Skills Required: ${job.skills_required?.join(', ') || 'N/A'}
- Description: ${job.description}

Write a tailored resume section in professional Markdown format. It must include:
1. **ATS Match Analysis:** A brief 1-2 sentence analysis of how well the candidate matches the job, identifying any critical missing skills.
2. **Professional Summary:** A strong, 2-sentence summary highlighting their fit for the target job.
3. **Tailored Experience:** 3-4 impactful bullet points (using the STAR method) that connect the candidate's existing skills to the job requirements.

Keep it highly actionable and optimized for ATS systems. Do not include contact info.
`

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert technical resume writer. Output ONLY markdown text without any introductory conversational text.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.2, // Lower temperature for more analytical/factual ATS output
    })

    const markdownContent = chatCompletion.choices[0].message.content

    return NextResponse.json({ data: markdownContent })

  } catch (err: any) {
    console.error('[resume tailor] error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
