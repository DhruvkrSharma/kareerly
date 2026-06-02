import { readFileSync } from 'fs'
import { resolve } from 'path'
import { chromium, Page } from 'playwright'
import Groq from 'groq-sdk'

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
const GROQ_API_KEY = process.env.GROQ_API_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!GROQ_API_KEY) {
  console.error('Missing GROQ_API_KEY')
  process.exit(1)
}

const groq = new Groq({ apiKey: GROQ_API_KEY })

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
  const { createHash } = require('crypto');
  return createHash('sha256').update(input).digest('hex');
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

const TARGETS = [
  { name: 'Razorpay', url: 'https://razorpay.com/jobs/' },
  { name: 'Zepto', url: 'https://careers.zeptonow.com/' },
  { name: 'CRED', url: 'https://careers.cred.club/' },
  { name: 'Meesho', url: 'https://careers.meesho.com/' },
  { name: 'Swiggy', url: 'https://careers.swiggy.com/' },
  { name: 'BrowserStack', url: 'https://www.browserstack.com/careers' },
  { name: 'PhonePe', url: 'https://careers.phonepe.com/' },
  { name: 'Flipkart', url: 'https://careers.flipkart.com/' },
  { name: 'Zomato', url: 'https://www.zomato.com/careers' },
  { name: 'Paytm', url: 'https://careers.paytm.com/' }
]

async function extractJobLinks(page: Page, baseUrl: string): Promise<string[]> {
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // Basic heuristic: find links that might be jobs
    const links = await page.$$eval('a', (anchors) => anchors.map(a => a.href))
    const jobLinks = links.filter(href => {
      const lower = href.toLowerCase()
      // avoid mailto, tel, and obvious non-job links
      if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return false
      // Only keep links that look like specific job postings, not the root careers page
      if (href === baseUrl || href + '/' === baseUrl) return false
      // Simple heuristic for job links
      return lower.includes('/job') || lower.includes('/careers/') || lower.includes('/openings/') || lower.includes('gh_jid') || lower.includes('req') || lower.includes('position') || /\d{5,}/.test(lower)
    })
    
    return Array.from(new Set(jobLinks)).slice(0, 3) // limit to 3 jobs per company for speed
  } catch (e) {
    console.error(`Failed to get links from ${baseUrl}:`, e)
    return []
  }
}

async function parseJobWithAI(text: string, url: string, companyName: string) {
  const prompt = `You are a job parser. Extract the following details from this job posting text.
If a field is missing, use null or appropriate defaults.
Job URL: ${url}
Company: ${companyName}

Extract as JSON with exact keys:
- title (string)
- description (string, full summary of the job)
- requirements (array of strings)
- skills_required (array of strings, e.g., ["React", "Python"])
- location (string)
- remote_ok (boolean)
- experience_min (number or null)
- experience_max (number or null)
- job_type (string: fulltime, parttime, contract, internship)
- salary_min (number or null)
- salary_max (number or null)

Text:
${text.substring(0, 6000)} // Truncated to fit context`

  try {
    const response = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
    
    const content = response.choices[0]?.message?.content
    if (!content) return null
    return JSON.parse(content)
  } catch (e) {
    console.error('Groq parse error:', e)
    return null
  }
}

async function main() {
  console.log('🚀 Starting Playwright scraper...')
  
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  const companiesToInsert = []
  const jobsToInsert = []
  
  for (const target of TARGETS) {
    console.log(`\n🔍 Scraping ${target.name}...`)
    
    const companySlug = slugify(target.name)
    companiesToInsert.push({
      name: target.name,
      slug: companySlug,
      logo_url: null,
      website: target.url,
      location: 'India', // default
      description: 'Tech company'
    })
    
    const jobLinks = await extractJobLinks(page, target.url)
    console.log(`Found ${jobLinks.length} potential job links.`)
    
    for (const link of jobLinks) {
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 })
        const bodyText = await page.evaluate(() => document.body.innerText)
        
        if (bodyText.length < 200) continue
        
        console.log(`Parsing job: ${link}`)
        const parsed = await parseJobWithAI(bodyText, link, target.name)
        if (!parsed || !parsed.title) continue
        
        jobsToInsert.push({
          companySlug,
          title: parsed.title,
          description: parsed.description || '',
          requirements: parsed.requirements || [],
          skills_required: parsed.skills_required || [],
          location: parsed.location || 'India',
          remote_ok: parsed.remote_ok || false,
          experience_min: parsed.experience_min,
          experience_max: parsed.experience_max,
          job_type: parsed.job_type || 'fulltime',
          salary_min: parsed.salary_min,
          salary_max: parsed.salary_max,
          apply_url: link, // Exact URL to the job
        })
      } catch (e) {
        console.error(`Error processing ${link}:`, e)
      }
    }
  }
  
  await browser.close()
  
  if (jobsToInsert.length === 0) {
    console.log('No jobs found.')
    return
  }

  // Deduplicate companies by slug before inserting
  const uniqueCompanies = Array.from(new Map(companiesToInsert.map(c => [c.slug, c])).values())

  console.log('\n🏗️  Upserting companies...')
  const companyResult = await rpc('companies', 'POST', uniqueCompanies, 'slug')
  if (!companyResult) { console.error('Failed to seed companies'); return }
  
  // Fetch all companies for ID mapping
  const allCompanies = await rpc('companies?select=id,name,location,slug', 'GET')
  if (!allCompanies) { console.error('Failed to fetch companies'); return }
  const companyMap = new Map<string, any>(allCompanies.map((c: any) => [c.slug, c]))

  console.log('\n📋 Upserting jobs...')
  const jobs = []

  for (const data of jobsToInsert) {
    const c = companyMap.get(data.companySlug)
    if (!c) continue

    const uniqueString = `${data.title}-${c.name}-${data.apply_url}`
    const contentHash = generateHash(uniqueString)

    jobs.push({
      company_id: c.id,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      skills_required: data.skills_required,
      location: data.location,
      remote_ok: data.remote_ok,
      salary_min: data.salary_min,
      salary_max: data.salary_max,
      experience_min: data.experience_min,
      experience_max: data.experience_max,
      job_type: data.job_type,
      apply_url: data.apply_url,
      source_url: data.apply_url,
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
