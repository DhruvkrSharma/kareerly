// scripts/embed.ts
// Generates embeddings for jobs using HuggingFace all-MiniLM-L6-v2 and updates Supabase

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { HfInference } from '@huggingface/inference'

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
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY!

if (!SUPABASE_URL || !SERVICE_KEY || !HUGGINGFACE_API_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or HUGGINGFACE_API_KEY in .env.local')
  process.exit(1)
}

const hf = new HfInference(HUGGINGFACE_API_KEY)

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function fetchUnembeddedJobs() {
  const url = `${SUPABASE_URL}/rest/v1/jobs?embedding=is.null&is_active=is.true&limit=50`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function updateJobEmbedding(id: number, embedding: number[]) {
  const url = `${SUPABASE_URL}/rest/v1/jobs?id=eq.${id}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ embedding })
  })
  if (!res.ok) throw new Error(await res.text())
}

async function main() {
  console.log('🔍 Finding jobs without embeddings...')
  const jobs = await fetchUnembeddedJobs()
  console.log(`   Found ${jobs.length} jobs to embed.`)

  if (jobs.length === 0) return

  for (const job of jobs) {
    const textToEmbed = `${job.title}. ${job.description || ''} ${job.skills_required?.join(' ') || ''}`
    
    try {
      const output = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: textToEmbed,
      })
      
      // Output could be nested arrays depending on the model, typically 1D array of floats
      const embedding = Array.isArray(output[0]) ? output[0] : output;
      
      await updateJobEmbedding(job.id, embedding as number[])
      console.log(`✅ Embedded job ID ${job.id}: ${job.title}`)
    } catch (e: any) {
      console.error(`❌ Failed to embed job ID ${job.id}:`, e.message)
    }
  }

  console.log('🎉 Embedding complete!')
}

main().catch(console.error)
