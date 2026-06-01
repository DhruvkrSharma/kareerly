// Seed script: pulls real jobs from RapidAPI JSearch
// Run with: npx tsx scripts/scrape.ts

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
try {
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
} catch (e) {
  // Ignore error if .env.local doesn't exist (e.g. in GitHub Actions)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

if (!RAPIDAPI_KEY) {
  console.error('Missing RAPIDAPI_KEY in .env.local. Get one from RapidAPI JSearch.')
  process.exit(1)
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function rpc(table: string, method: string, body?: any, onConflict?: string) {
  const url = onConflict ? `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}` : `${SUPABASE_URL}/rest/v1/${table}`
  const postPrefer = onConflict ? 'return=representation,resolution=merge-duplicates' : 'return=representation'
  const res = await fetch(url, {
    method,
    headers: { ...headers, ...(method === 'POST' ? { Prefer: postPrefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[${method} ${table}] ${res.status}: ${text}`)
    return null
  }
  return res.json()
}

function generateHash(input: string): string {
  // Simple hash for content_hash deduplication
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

async function fetchJSearchJobs(query: string) {
  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1`
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
    }
  }

  const response = await fetch(url, options)
  if (!response.ok) {
    console.error('JSearch API failed:', await response.text())
    return []
  }
  const json = await response.json()
  return json.data || []
}

async function main() {
  console.log('🔍 Fetching jobs from RapidAPI JSearch...')
  const jsearchData = await fetchJSearchJobs('software engineer india')
  console.log(`   Found ${jsearchData.length} jobs.`)

  if (jsearchData.length === 0) {
    console.log('No jobs to process.')
    return
  }

  const companiesToInsert = []
  const jobsToInsertData = []

  for (const item of jsearchData) {
    if (!item.employer_name || !item.job_title) continue

    const companySlug = slugify(item.employer_name)
    companiesToInsert.push({
      name: item.employer_name,
      slug: companySlug,
      logo_url: item.employer_logo || null,
      website: item.employer_website || null,
      location: item.job_city ? `${item.job_city}, ${item.job_country}` : item.job_country || 'India',
      description: item.employer_company_type ? `Type: ${item.employer_company_type}` : 'Tech company',
    })

    jobsToInsertData.push({
      jsearchItem: item,
      companySlug: companySlug,
    })
  }

  // Deduplicate companies by slug before inserting
  const uniqueCompanies = Array.from(new Map(companiesToInsert.map(c => [c.slug, c])).values())

  console.log('🏗️  Upserting companies...')
  const companyResult = await rpc('companies', 'POST', uniqueCompanies, 'slug')
  if (!companyResult) { console.error('Failed to seed companies'); return }
  console.log(`   ✅ Upserted ${companyResult.length} companies`)

  // Fetch all companies for ID mapping
  const allCompanies = await rpc('companies?select=id,name,location,slug', 'GET')
  if (!allCompanies) { console.error('Failed to fetch companies'); return }
  const companyMap = new Map<string, any>(allCompanies.map((c: any) => [c.slug, c]))

  console.log('\n📋 Upserting jobs...')
  const jobs = []

  for (const data of jobsToInsertData) {
    const c = companyMap.get(data.companySlug)
    if (!c) continue

    const t = data.jsearchItem
    
    // Map FULLTIME to fulltime etc
    let jobType = 'fulltime'
    if (t.job_employment_type) {
      const typeStr = t.job_employment_type.toLowerCase()
      if (typeStr.includes('part')) jobType = 'parttime'
      else if (typeStr.includes('contract')) jobType = 'contract'
      else if (typeStr.includes('intern')) jobType = 'internship'
    }

    const uniqueString = `${c.id}-${t.job_title}-${t.job_city}`
    const contentHash = generateHash(uniqueString)

    jobs.push({
      company_id: c.id,
      title: t.job_title,
      description: t.job_description ? t.job_description.substring(0, 500) + '...' : `Join ${c.name} as a ${t.job_title}.`,
      requirements: [],
      skills_required: [],
      location: t.job_city ? `${t.job_city}, ${t.job_country}` : t.job_country || 'India',
      remote_ok: t.job_is_remote === true,
      salary_min: t.job_min_salary || null,
      salary_max: t.job_max_salary || null,
      experience_min: null,
      experience_max: null,
      job_type: jobType,
      apply_url: t.job_apply_link || null,
      source_url: t.job_google_link || null,
      content_hash: contentHash,
      is_active: true,
      scraped_at: new Date().toISOString(),
    })
  }

  // Deduplicate jobs by content_hash before inserting
  const uniqueJobs = Array.from(new Map(jobs.map(j => [j.content_hash, j])).values())

  const jobResult = await rpc('jobs', 'POST', uniqueJobs, 'content_hash')
  if (!jobResult) { console.error('Failed to seed jobs'); return }
  console.log(`   ✅ Upserted ${jobResult.length} jobs`)

  console.log('\n🎉 Scraping complete!')
}

main().catch(console.error)
