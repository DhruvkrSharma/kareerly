'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, Briefcase, MapPin, Trash2, ExternalLink, Search, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Toast } from '@/components/ui/Navigation'
import { scoreToPercent } from '@/lib/score'
import { isDemoMode } from '@/lib/demo'
import { authFetch } from '@/lib/api'

interface SavedJob {
  rec_id: number
  job_id: number
  title: string
  company_name: string
  company_logo: string | null
  location: string
  remote_ok: boolean
  score: number
  confidence: number
  tier: number
  swipe_action: 'save' | 'apply'
  swiped_at: string
  apply_url: string
  skills: string[]
}

const DEMO_SAVED_JOBS: SavedJob[] = [
  {
    rec_id: 101,
    job_id: 201,
    title: 'Senior Frontend Engineer',
    company_name: 'TechCorp Inc.',
    company_logo: null,
    location: 'Bengaluru · Hybrid',
    remote_ok: false,
    score: 0.94,
    confidence: 0.9,
    tier: 1,
    swipe_action: 'save',
    swiped_at: new Date().toISOString(),
    apply_url: 'https://techcorp.example.com',
    skills: ['React', 'TypeScript', 'Next.js']
  },
  {
    rec_id: 102,
    job_id: 202,
    title: 'Product Designer',
    company_name: 'Innovate Studio',
    company_logo: null,
    location: 'Remote',
    remote_ok: true,
    score: 0.88,
    confidence: 0.85,
    tier: 2,
    swipe_action: 'save',
    swiped_at: new Date().toISOString(),
    apply_url: 'https://innovate.example.com',
    skills: ['Figma', 'Design Systems', 'Prototyping']
  },
  {
    rec_id: 103,
    job_id: 203,
    title: 'Full Stack Developer',
    company_name: 'Global FinTech',
    company_logo: null,
    location: 'Mumbai',
    remote_ok: false,
    score: 0.91,
    confidence: 0.88,
    tier: 1,
    swipe_action: 'apply',
    swiped_at: new Date().toISOString(),
    apply_url: 'https://fintech.example.com',
    skills: ['Node.js', 'React', 'PostgreSQL']
  }
]

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<'save' | 'apply'>('save')
  const [jobs, setJobs] = useState<SavedJob[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null)
  const router = useRouter()

  function showToast(message: string, type: 'success' | 'info' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchSaved()
  }, [])

  async function fetchSaved() {
    setLoading(true)
    try {
      const res = await authFetch('/api/saved')
      if (res.status === 401) {
        router.push('/auth/login')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      
      if (json.data && json.data.length > 0) {
        setJobs(json.data)
      } else if (isDemoMode()) {
        setJobs(DEMO_SAVED_JOBS)
      } else {
        setJobs([])
      }
    } catch (err) {
      console.error(err)
      if (isDemoMode()) {
        setJobs(DEMO_SAVED_JOBS)
      } else {
        setJobs([])
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle unsave / delete
  async function handleRemove(recId: number, jobId: number) {
    // Optimistic UI update
    setJobs(prev => prev.filter(j => j.rec_id !== recId))
    showToast('Job removed from list')

    try {
      await authFetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          rec_id: recId,
          action: 'reject'
        })
      })
    } catch (err) {
      console.error('Failed to remove job', err)
    }
  }

  // Move from saved to applied
  async function handleApply(recId: number, jobId: number, applyUrl: string) {
    // Open in new tab
    if (applyUrl && applyUrl !== '#') {
      window.open(applyUrl, '_blank', 'noopener,noreferrer')
      showToast('Opening job in new tab...', 'success')
    } else {
      showToast('Job link unavailable', 'info')
    }

    // Update local state
    setJobs(prev => prev.map(j => {
      if (j.rec_id === recId) {
        return { ...j, swipe_action: 'apply' }
      }
      return j
    }))

    try {
      await authFetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          rec_id: recId,
          action: 'apply'
        })
      })
    } catch (err) {
      console.error('Failed to log application', err)
    }
  }

  // Filter jobs based on active tab and search query
  const filteredJobs = jobs.filter(job => {
    const matchesTab = job.swipe_action === activeTab
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesTab && matchesSearch
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-on-surface tracking-tight">
            Saved & Applications
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Track and manage jobs you have bookmarked or applied to
          </p>
        </div>

        {/* Search bar */}
        <div 
          className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-outline-variant text-sm w-full md:w-72"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search saved jobs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full text-on-surface placeholder:text-on-surface-variant/40 text-sm"
          />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-outline-variant pb-2">
        <button
          onClick={() => setActiveTab('save')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'save'
              ? 'border-primary-container text-on-surface font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          Bookmarked ({jobs.filter(j => j.swipe_action === 'save').length})
        </button>
        <button
          onClick={() => setActiveTab('apply')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'apply'
              ? 'border-primary-container text-on-surface font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Applications ({jobs.filter(j => j.swipe_action === 'apply').length})
        </button>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 rounded-full border-4 border-primary-container border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredJobs.map(job => (
              <motion.div
                key={job.rec_id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="glass-card glass-card-hover p-6 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Background glow for Top Match */}
                {scoreToPercent(job.score) >= 90 && (
                  <div 
                    className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-5 blur-2xl pointer-events-none"
                    style={{ background: 'var(--primary-container)' }}
                  />
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    {/* Mock Logo */}
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-black text-lg border border-outline-variant"
                      style={{ 
                        background: 'var(--surface-container-highest)', 
                        color: scoreToPercent(job.score) >= 90 ? 'var(--primary-container)' : 'var(--secondary)' 
                      }}
                    >
                      {job.company_name.charAt(0)}
                    </div>

                    <div className="flex flex-col items-end">
                      <span 
                        className="badge"
                        style={{ 
                          background: 'color-mix(in srgb, var(--primary-container) 12%, transparent)', 
                          color: 'var(--primary-container)',
                          border: '1px solid color-mix(in srgb, var(--primary-container) 25%, transparent)'
                        }}
                      >
                        {scoreToPercent(job.score)}% match
                      </span>
                    </div>
                  </div>

                  <h3 className="font-display font-black text-base text-on-surface mb-0.5 leading-snug line-clamp-1">
                    {job.title}
                  </h3>
                  <p className="text-xs font-mono uppercase tracking-widest text-on-surface-variant font-semibold">
                    {job.company_name}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-3">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{job.location}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {job.skills.slice(0, 3).map(skill => (
                      <span
                        key={skill}
                        className="badge"
                        style={{ 
                          background: 'var(--surface-container-low)', 
                          color: 'var(--on-surface-variant)',
                          border: '1px solid var(--outline-variant)'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-outline-variant/40 mt-5 pt-4 flex items-center justify-between">
                  <button
                    onClick={() => handleRemove(job.rec_id, job.job_id)}
                    className="p-2 text-on-surface-variant hover:text-error hover:bg-surface-container-high rounded-xl transition-all"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>

                  {job.swipe_action === 'save' ? (
                    <button
                      onClick={() => handleApply(job.rec_id, job.job_id, job.apply_url)}
                      className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5"
                    >
                      Apply Now <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-tertiary">
                      <CheckCircle2 className="w-4 h-4" /> Applied
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {filteredJobs.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-outline-variant"
                style={{ background: 'var(--surface-container-low)' }}
              >
                <Bookmark className="w-8 h-8 text-on-surface-variant" />
              </div>
              <h3 className="font-display font-bold text-lg text-on-surface">No jobs found</h3>
              <p className="text-sm text-on-surface-variant mt-1.5 max-w-sm">
                {searchQuery ? "We couldn't find any jobs matching your keywords." : "You haven't bookmarked any jobs in this category yet."}
              </p>
              <button
                onClick={() => router.push('/feed/discover')}
                className="btn-primary mt-6"
              >
                Discover Roles
              </button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Toast message={toast.message} type={toast.type} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
