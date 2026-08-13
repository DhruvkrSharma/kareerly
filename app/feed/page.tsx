'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Toast } from '@/components/ui/Navigation'
import type { TabId } from '@/components/ui/Navigation'
import { ChevronRight, Zap } from 'lucide-react'
import { authFetch } from '@/lib/api'
import { scoreToPercent } from '@/lib/score'
import type { FeedCard } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface SavedSummary {
  rec_id: number
  title: string
  company_name: string
  swipe_action: string
  pipeline_stage?: string | null
  score: number
}

export default function FeedDashboard() {
  const router = useRouter()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null)
  const [feedCards, setFeedCards] = useState<FeedCard[]>([])
  const [savedJobs, setSavedJobs] = useState<SavedSummary[]>([])
  const [profileName, setProfileName] = useState('there')
  const [profileStrength, setProfileStrength] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  function showToast(message: string, type: 'success' | 'info' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleNavigate = (tab: TabId) => {
    if (tab === 'home') {
      router.push('/feed')
    } else {
      router.push(`/feed/${tab}`)
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_completion_score')
            .eq('id', user.id)
            .maybeSingle()
          if (profile?.full_name) setProfileName(profile.full_name.split(' ')[0])
          if (profile?.profile_completion_score != null) {
            setProfileStrength(profile.profile_completion_score)
          }
        }

        const [feedRes, savedRes] = await Promise.all([
          authFetch('/api/feed'),
          authFetch('/api/saved'),
        ])

        if (feedRes.ok) {
          const feedJson = await feedRes.json()
          setFeedCards(feedJson.data ?? [])
        }
        if (savedRes.ok) {
          const savedJson = await savedRes.json()
          setSavedJobs(savedJson.data ?? [])
        }
      } catch (err) {
        console.error('Dashboard load failed', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const topMatches = feedCards.filter(c => c.tier <= 2).slice(0, 3)
  const remoteCount = feedCards.filter(c => c.remote_ok).length
  const topMatchCount = feedCards.filter(c => c.tier === 1).length

  const tiles = [
    { label: 'Top Matches', count: topMatchCount, emoji: '🎯', color: '#22c55e' },
    { label: 'Feed Jobs', count: feedCards.length, emoji: '✨', color: '#3b82f6' },
    { label: 'Remote Jobs', count: remoteCount, emoji: '🌐', color: '#6366f1' },
    { label: 'Saved', count: savedJobs.filter(j => j.swipe_action === 'save').length, emoji: '🚀', color: '#f59e0b' },
    { label: 'Applied', count: savedJobs.filter(j => j.swipe_action === 'apply').length, emoji: '🤖', color: '#a855f7' },
    { label: 'Interviewing', count: savedJobs.filter(j => j.pipeline_stage === 'interviewing').length, emoji: '📚', color: '#ec4899' },
  ]

  const activeApplications = savedJobs.filter(
    j => j.swipe_action === 'apply' || j.pipeline_stage === 'interviewing'
  ).slice(0, 4)

  return (
    <div className="space-y-10">
      <section>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-black text-on-surface tracking-tight"
        >
          Namaste, {profileName} 👋
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-on-surface-variant mt-2 max-w-xl flex items-center gap-3 flex-wrap"
        >
          {profileStrength != null ? (
            <>
              Your profile is at{' '}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-display font-bold text-sm"
                style={{ background: 'color-mix(in srgb, var(--primary-container) 15%, transparent)', color: 'var(--primary-container)' }}
              >
                {profileStrength}% strength
              </span>
            </>
          ) : (
            <span className="text-sm">Complete your profile to unlock better matches.</span>
          )}
        </motion.p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-display font-bold text-on-surface">Explore Categories</h2>
              <button onClick={() => handleNavigate('discover')} className="text-xs font-mono font-bold text-primary hover:underline">
                VIEW ALL →
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tiles.map((t, i) => (
                <motion.button
                  key={t.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => handleNavigate('discover')}
                  className="glass-card glass-card-hover p-4 rounded-2xl text-left group"
                >
                  <div className="text-2xl mb-2">{t.emoji}</div>
                  <div className="font-display font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                    {t.label}
                  </div>
                  <div className="text-xs font-mono mt-1" style={{ color: t.color }}>
                    {loading ? '…' : `${t.count} jobs`}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-display font-bold text-on-surface">Top Matches</h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-full border-4 border-primary-container border-t-transparent animate-spin" />
              </div>
            ) : topMatches.length === 0 ? (
              <div className="glass-card p-8 rounded-3xl text-center">
                <p className="text-on-surface-variant mb-4">No recommendations yet. Swipe through roles to build your feed.</p>
                <button onClick={() => handleNavigate('discover')} className="btn-primary">Start Discovering</button>
              </div>
            ) : (
              <>
                {topMatches.slice(0, 1).map(card => (
                  <motion.div
                    key={card.rec_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card glass-card-hover p-7 rounded-3xl relative overflow-hidden mb-4 cursor-pointer"
                    onClick={() => handleNavigate('discover')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-xl border border-outline-variant"
                          style={{ background: 'var(--surface-container-highest)', color: '#3b82f6' }}
                        >
                          {(card.company_name ?? 'J').charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-mono font-bold uppercase tracking-widest text-on-surface-variant">
                            {card.company_name}
                          </p>
                          <h3 className="text-xl font-display font-extrabold text-on-surface mt-0.5">
                            {card.title}
                          </h3>
                          <p className="text-sm text-on-surface-variant mt-1">
                            {card.location ?? 'India'}{card.remote_ok ? ' · Remote' : ''}
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-4 flex-shrink-0"
                        style={{ borderColor: '#22c55e', color: '#22c55e' }}
                      >
                        <span className="font-display font-black text-lg leading-none">{scoreToPercent(card.score)}%</span>
                        <span className="text-[8px] font-mono uppercase">match</span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topMatches.slice(1).map((card, i) => (
                    <motion.div
                      key={`${card.rec_id}-${i}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card glass-card-hover p-5 rounded-2xl cursor-pointer"
                      onClick={() => handleNavigate('discover')}
                    >
                      <div className="flex justify-between mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-sm border border-outline-variant"
                          style={{ background: 'var(--surface-container-highest)', color: '#3b82f6' }}
                        >
                          {(card.company_name ?? 'J').charAt(0)}
                        </div>
                        <span
                          className="badge"
                          style={{ background: 'color-mix(in srgb, #22c55e 15%, transparent)', color: '#22c55e', border: '1px solid #22c55e44' }}
                        >
                          {scoreToPercent(card.score)}% match
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-on-surface">{card.title}</h4>
                      <p className="text-xs text-on-surface-variant mt-1">{card.company_name} · {card.location ?? 'India'}</p>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="font-display font-bold text-lg text-on-surface mb-5">Profile Strength</h3>
            {profileStrength != null ? (
              <div className="flex items-center gap-5 mb-5">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-container-highest)" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke="var(--primary-container)" strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="213.6"
                      strokeDashoffset={213.6 - (213.6 * profileStrength) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display font-black text-lg text-on-surface">{profileStrength}%</span>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant leading-snug">
                  Complete your profile to improve match quality.
                </p>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant mb-5">Finish onboarding to see your profile score.</p>
            )}
            <button
              onClick={() => handleNavigate('profile')}
              className="w-full mt-2 btn-ghost"
            >
              Edit Profile
            </button>
          </div>

          <div className="glass-card p-6 rounded-3xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display font-bold text-lg text-on-surface">Applications</h3>
              <span
                className="badge"
                style={{ background: 'color-mix(in srgb, var(--secondary) 15%, transparent)', color: 'var(--secondary)', border: '1px solid color-mix(in srgb, var(--secondary) 30%, transparent)' }}
              >
                {activeApplications.length} Active
              </span>
            </div>
            {activeApplications.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No active applications yet.</p>
            ) : (
              <div className="space-y-3">
                {activeApplications.map(app => (
                  <button
                    key={app.rec_id}
                    onClick={() => handleNavigate('kanban')}
                    className="w-full p-4 rounded-xl border border-outline-variant text-left transition-colors hover:bg-surface-container-high"
                    style={{ background: 'var(--surface-container-low)' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-display font-bold text-sm text-on-surface">{app.company_name}</span>
                      <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--secondary)' }}>
                        {(app.pipeline_stage ?? app.swipe_action).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant">{app.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-6 rounded-3xl">
            <h3 className="font-display font-bold text-lg text-on-surface mb-5">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: 'Discover roles', tab: 'discover' as TabId },
                { label: 'View pipeline', tab: 'kanban' as TabId },
                { label: 'Saved jobs', tab: 'saved' as TabId },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={() => handleNavigate(action.tab)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-surface-container-high text-left"
                  style={{ background: 'var(--surface-container-low)' }}
                >
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-display font-bold text-sm text-on-surface">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

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
