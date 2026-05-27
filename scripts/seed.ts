// Seed script: populates companies, jobs, and recommendations for testing
// Run with: npx tsx scripts/seed.ts

import { readFileSync } from 'fs'
import { resolve } from 'path'

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
const USER_ID = process.env.SEED_USER_ID || '4e611c35-d8a0-4096-8cef-09bb6d0e95fd'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
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

const NEW_COMPANIES = [
  { name: 'Zerodha', slug: 'zerodha', location: 'Bengaluru', website: 'https://zerodha.com', tech_stack: ['Ruby', 'Go', 'PostgreSQL', 'React'], remote_policy: 'hybrid', employee_count: '1000-5000', founded_year: 2010, description: 'India\'s largest stock broker by volume' },
  { name: 'CRED', slug: 'cred', location: 'Bengaluru', website: 'https://cred.club', tech_stack: ['Kotlin', 'Swift', 'Node.js', 'PostgreSQL'], remote_policy: 'hybrid', employee_count: '500-1000', founded_year: 2018, description: 'Members-only credit card payments platform' },
  { name: 'Zepto', slug: 'zepto', location: 'Mumbai', website: 'https://zeptonow.com', tech_stack: ['Python', 'Go', 'React', 'Kubernetes'], remote_policy: 'onsite', employee_count: '1000-5000', founded_year: 2021, description: '10-minute grocery delivery' },
  { name: 'Jupiter', slug: 'jupiter', location: 'Bengaluru', website: 'https://jupiter.money', tech_stack: ['Kotlin', 'React Native', 'Node.js'], remote_policy: 'hybrid', employee_count: '200-500', founded_year: 2019, description: 'Digital banking platform' },
  { name: 'Groww', slug: 'groww', location: 'Bengaluru', website: 'https://groww.in', tech_stack: ['Java', 'React', 'Kafka', 'PostgreSQL'], remote_policy: 'hybrid', employee_count: '1000-5000', founded_year: 2016, description: 'Investment platform for stocks, mutual funds, and more' },
  { name: 'PhonePe', slug: 'phonepe', location: 'Bengaluru', website: 'https://phonepe.com', tech_stack: ['Java', 'Kotlin', 'React', 'Kafka'], remote_policy: 'onsite', employee_count: '5000+', founded_year: 2015, description: 'UPI-based digital payments leader' },
  { name: 'Swiggy', slug: 'swiggy', location: 'Bengaluru', website: 'https://swiggy.com', tech_stack: ['Python', 'Java', 'React', 'Kubernetes'], remote_policy: 'hybrid', employee_count: '5000+', founded_year: 2014, description: 'Food and grocery delivery platform' },
  { name: 'Flipkart', slug: 'flipkart', location: 'Bengaluru', website: 'https://flipkart.com', tech_stack: ['Java', 'React', 'Kafka', 'MySQL'], remote_policy: 'hybrid', employee_count: '5000+', founded_year: 2007, description: 'India\'s largest e-commerce marketplace' },
  { name: 'Postman', slug: 'postman', location: 'Bengaluru', website: 'https://postman.com', tech_stack: ['Node.js', 'React', 'Electron', 'Go'], remote_policy: 'remote', employee_count: '500-1000', founded_year: 2014, description: 'API development collaboration platform' },
  { name: 'Freshworks', slug: 'freshworks', location: 'Chennai', website: 'https://freshworks.com', tech_stack: ['Ruby', 'React', 'PostgreSQL', 'AWS'], remote_policy: 'hybrid', employee_count: '5000+', founded_year: 2010, description: 'SaaS for customer engagement and IT service management' },
  { name: 'Coinbase India', slug: 'coinbase-india', location: 'Remote (India)', website: 'https://coinbase.com', tech_stack: ['Go', 'React', 'PostgreSQL', 'Kubernetes'], remote_policy: 'remote', employee_count: '200-500', founded_year: 2022, description: 'Crypto exchange engineering hub in India' },
  { name: 'Atlassian', slug: 'atlassian-india', location: 'Bengaluru', website: 'https://atlassian.com', tech_stack: ['Java', 'TypeScript', 'React', 'AWS'], remote_policy: 'remote', employee_count: '5000+', founded_year: 2002, description: 'Makers of Jira, Confluence, and Trello' },
  { name: 'BrowserStack', slug: 'browserstack', location: 'Mumbai', website: 'https://browserstack.com', tech_stack: ['Ruby', 'Java', 'React', 'Selenium'], remote_policy: 'hybrid', employee_count: '500-1000', founded_year: 2011, description: 'Cloud-based testing platform for web and mobile apps' },
  { name: 'PhysicsWallah', slug: 'physicswallah', location: 'Noida', website: 'https://physicswallah.live', tech_stack: ['React Native', 'Node.js', 'MongoDB', 'AWS'], remote_policy: 'onsite', employee_count: '1000-5000', founded_year: 2020, description: 'EdTech unicorn for affordable education' },
  { name: 'Navi Technologies', slug: 'navi', location: 'Bengaluru', website: 'https://navi.com', tech_stack: ['Python', 'Kotlin', 'React', 'TensorFlow'], remote_policy: 'hybrid', employee_count: '500-1000', founded_year: 2018, description: 'AI-first financial services by Flipkart co-founder' },
]

const JOB_TEMPLATES = [
  { title: 'Senior Backend Engineer', skills: ['Go', 'PostgreSQL', 'Kafka', 'Kubernetes'], exp_min: 3, exp_max: 7, salary_min: 2500000, salary_max: 4500000, type: 'fulltime' },
  { title: 'Frontend Engineer', skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'], exp_min: 2, exp_max: 5, salary_min: 1800000, salary_max: 3500000, type: 'fulltime' },
  { title: 'ML Engineer', skills: ['Python', 'PyTorch', 'TensorFlow', 'MLOps'], exp_min: 2, exp_max: 6, salary_min: 2200000, salary_max: 4800000, type: 'fulltime' },
  { title: 'DevOps Engineer', skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker'], exp_min: 2, exp_max: 5, salary_min: 2000000, salary_max: 4000000, type: 'fulltime' },
  { title: 'iOS Developer', skills: ['Swift', 'SwiftUI', 'Combine', 'Core Data'], exp_min: 2, exp_max: 5, salary_min: 2000000, salary_max: 3800000, type: 'fulltime' },
  { title: 'Data Scientist', skills: ['Python', 'SQL', 'Pandas', 'Scikit-learn'], exp_min: 1, exp_max: 4, salary_min: 1500000, salary_max: 3200000, type: 'fulltime' },
  { title: 'Android Engineer', skills: ['Kotlin', 'Jetpack Compose', 'Coroutines', 'Room'], exp_min: 2, exp_max: 5, salary_min: 1800000, salary_max: 3600000, type: 'fulltime' },
  { title: 'Full Stack Intern', skills: ['React', 'Node.js', 'MongoDB', 'Git'], exp_min: 0, exp_max: 1, salary_min: 300000, salary_max: 600000, type: 'internship' },
  { title: 'Platform Engineer', skills: ['Go', 'gRPC', 'Kubernetes', 'Prometheus'], exp_min: 3, exp_max: 7, salary_min: 2800000, salary_max: 5000000, type: 'fulltime' },
  { title: 'Product Designer', skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'], exp_min: 2, exp_max: 5, salary_min: 1500000, salary_max: 3000000, type: 'fulltime' },
]

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function generateHash(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

async function main() {
  console.log('🏗️  Seeding companies...')
  const companyResult = await rpc('companies', 'POST', NEW_COMPANIES, 'slug')
  if (!companyResult) { console.error('Failed to seed companies'); return }
  console.log(`   ✅ Inserted ${companyResult.length} companies`)

  // Fetch all companies for ID mapping
  const allCompanies = await rpc('companies?select=id,name,location,slug', 'GET')
  if (!allCompanies) { console.error('Failed to fetch companies'); return }
  const companyMap = new Map<string, any>(allCompanies.map((c: any) => [c.slug, c]))

  console.log('\n📋 Seeding jobs...')
  const jobs: any[] = []

  // Assign 1-2 random job templates to each new company
  for (const comp of NEW_COMPANIES) {
    const c = companyMap.get(comp.slug)
    if (!c) continue
    const templates = pickRandom(JOB_TEMPLATES, Math.random() > 0.5 ? 2 : 1)
    for (const t of templates) {
      jobs.push({
        company_id: c.id,
        title: t.title,
        description: `Join ${comp.name} as a ${t.title}. Work with cutting-edge technologies in ${comp.location}.`,
        requirements: [`${t.exp_min}+ years experience`, 'Strong problem-solving skills', 'Team player'],
        skills_required: t.skills,
        location: comp.location,
        remote_ok: comp.remote_policy === 'remote',
        salary_min: t.salary_min,
        salary_max: t.salary_max,
        experience_min: t.exp_min,
        experience_max: t.exp_max,
        job_type: t.type,
        apply_url: `${comp.website}/careers`,
        source_url: `${comp.website}/careers/${t.title.toLowerCase().replace(/ /g, '-')}`,
        content_hash: generateHash(),
        is_active: true,
        scraped_at: new Date().toISOString(),
      })
    }
  }

  const jobResult = await rpc('jobs', 'POST', jobs, 'content_hash')
  if (!jobResult) { console.error('Failed to seed jobs'); return }
  console.log(`   ✅ Inserted ${jobResult.length} jobs`)

  console.log('\n🎯 Seeding recommendations...')
  const recs: any[] = []
  for (const job of jobResult) {
    const score = +(0.55 + Math.random() * 0.4).toFixed(3)
    const confidence = +(0.5 + Math.random() * 0.45).toFixed(3)
    const tier = score > 0.85 ? 1 : score > 0.7 ? 2 : score > 0.55 ? 3 : 4

    recs.push({
      user_id: USER_ID,
      job_id: job.id,
      score,
      confidence,
      scoring_version: 'v1',
      embedding_version: 'minilm-l6-v2',
      score_factors: {
        skills_overlap: +(Math.random() * 0.4 + 0.5).toFixed(2),
        domain_match: +(Math.random() * 0.3 + 0.6).toFixed(2),
        experience_fit: +(Math.random() * 0.4 + 0.5).toFixed(2),
      },
      tier,
      feed_rank: recs.length + 1,
      status: 'active',
      freshness_score: +(0.7 + Math.random() * 0.3).toFixed(3),
      viewed: false,
      swiped: false,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    })
  }

  const recResult = await rpc('recommendations', 'POST', recs)
  if (!recResult) { console.error('Failed to seed recommendations'); return }
  console.log(`   ✅ Inserted ${recResult.length} recommendations`)

  console.log('\n🎉 Seeding complete!')
  console.log(`   Companies: ${allCompanies.length} total`)
  console.log(`   Jobs: ${jobResult.length} new (+ existing)`)
  console.log(`   Recommendations: ${recResult.length} new (unswiped, ready for feed)`)
}

main().catch(console.error)
