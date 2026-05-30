// scripts/score.ts
// Generates AI scores using Groq for matching users with jobs

import { readFileSync } from 'fs'
import { resolve } from 'path'
import Groq from 'groq-sdk'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx)
  const val = trimmed.slice(eqIdx + 1)
  if (!process.env[key]) process.env[key] = val
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GROQ_API_KEY = process.env.GROQ_API_KEY!
const SEED_USER_ID = process.env.SEED_USER_ID || '4e611c35-d8a0-4096-8cef-09bb6d0e95fd'

if (!SUPABASE_URL || !SERVICE_KEY || !GROQ_API_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GROQ_API_KEY in .env.local')
  process.exit(1)
}

const groq = new Groq({ apiKey: GROQ_API_KEY })

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function fetchProfile(userId: string) {
  const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`
  const res = await fetch(url, { headers })
  const json = await res.json()
  return json[0]
}

async function fetchCandidateJobs(userId: string) {
  // Normally we would use pgvector here: `match_jobs` RPC
  // For now, if we don't have embeddings, we'll just fetch a few active jobs that aren't already recommended
  
  // First, get jobs already in recommendations for this user
  const recUrl = `${SUPABASE_URL}/rest/v1/recommendations?user_id=eq.${userId}&select=job_id`
  const recRes = await fetch(recUrl, { headers })
  const existingRecs = await recRes.json()
  const existingIds = existingRecs.map((r: any) => r.job_id)

  let jobsUrl = `${SUPABASE_URL}/rest/v1/jobs?is_active=is.true&limit=10`
  if (existingIds.length > 0) {
    jobsUrl += `&id=not.in.(${existingIds.join(',')})`
  }

  const jobsRes = await fetch(jobsUrl, { headers })
  return jobsRes.json()
}

async function generateScore(profile: any, job: any) {
  const prompt = `
You are an expert tech recruiter AI. Analyze the fit between this candidate and this job.
Return ONLY a valid JSON object with the following schema:
{
  "score": <float between 0 and 1, where 1 is perfect match>,
  "confidence": <float between 0 and 1>,
  "score_factors": {
    "skills_overlap": <float between 0 and 1>,
    "experience_fit": <float between 0 and 1>,
    "domain_match": <float between 0 and 1>
  },
  "tier": <integer 1 to 4, where 1 is 90%+ match, 2 is 75-89%, 3 is 50-74%, 4 is <50%>
}

Candidate Profile:
- Skills: ${profile.skills?.join(', ') || 'Unknown'}
- Experience: ${profile.experience_years} years
- Preferred Roles: ${profile.preferred_roles?.join(', ') || 'Unknown'}

Job Description:
- Title: ${job.title}
- Skills Required: ${job.skills_required?.join(', ') || 'Unknown'}
- Experience Required: ${job.experience_min} to ${job.experience_max} years
`

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a JSON-only response bot.' },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    response_format: { type: 'json_object' }
  })

  return JSON.parse(chatCompletion.choices[0].message.content || '{}')
}

async function insertRecommendation(userId: string, jobId: number, result: any, rank: number) {
  const body = {
    user_id: userId,
    job_id: jobId,
    score: result.score,
    confidence: result.confidence,
    scoring_version: 'groq-llama3',
    score_factors: result.score_factors,
    tier: result.tier,
    feed_rank: rank,
    status: 'active',
  }
  
  const url = `${SUPABASE_URL}/rest/v1/recommendations`
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(body)
  })
  
  if (!res.ok) throw new Error(await res.text())
}

async function main() {
  console.log(`👤 Fetching profile for ${SEED_USER_ID}...`)
  const profile = await fetchProfile(SEED_USER_ID)
  
  if (!profile) {
    console.error('Profile not found.')
    return
  }

  console.log('🔍 Fetching candidate jobs...')
  const jobs = await fetchCandidateJobs(SEED_USER_ID)
  console.log(`   Found ${jobs.length} new jobs to score.`)

  let rankCounter = 100 // put them at the end of the current feed

  for (const job of jobs) {
    try {
      console.log(`🤖 Scoring job ${job.id}: ${job.title}...`)
      const scoreResult = await generateScore(profile, job)
      
      await insertRecommendation(SEED_USER_ID, job.id, scoreResult, rankCounter++)
      console.log(`   ✅ Inserted recommendation: Score ${scoreResult.score}, Tier ${scoreResult.tier}`)
    } catch (e: any) {
      console.error(`   ❌ Failed to score/insert job ${job.id}:`, e.message)
    }
  }

  console.log('🎉 AI Scoring complete!')
}

main().catch(console.error)
