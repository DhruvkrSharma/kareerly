'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Toast } from '@/components/ui/Navigation'
import type { TabId } from '@/components/ui/Navigation'
import {
  CheckCircle, ChevronRight, Zap
} from 'lucide-react'

export default function FeedDashboard() {
  const router = useRouter()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null)

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

  const tiles = [
    { label: 'Top Matches',     count: 6,  emoji: '🎯', color: '#22c55e' },
    { label: 'New This Week',   count: 12, emoji: '✨', color: '#3b82f6' },
    { label: 'Remote Jobs',     count: 8,  emoji: '🌐', color: '#6366f1' },
    { label: 'Startups Hiring', count: 15, emoji: '🚀', color: '#f59e0b' },
    { label: 'AI / ML Roles',   count: 4,  emoji: '🤖', color: '#a855f7' },
    { label: 'Internships',     count: 7,  emoji: '📚', color: '#ec4899' },
  ]

  const matchedJobs = [
    {
      title: 'Backend Engineer', company: 'Razorpay', location: 'Bengaluru',
      salary: '₹28L–₹42L', match: 92, logo: 'R', color: '#3b82f6',
    },
    {
      title: 'ML Engineer', company: 'Razorpay', location: 'Remote',
      salary: '₹32L–₹48L', match: 85, logo: 'R', color: '#3b82f6',
    },
    {
      title: 'Data Scientist', company: 'Meesho', location: 'Bengaluru',
      salary: '₹25L–₹38L', match: 78, logo: 'M', color: '#ec4899',
    },
  ]

  const applications = [
    { company: 'Zepto', role: 'iOS Engineer', status: 'INTERVIEWING', progress: 75, color: '#22c55e' },
    { company: 'CRED',  role: 'Android Eng',  status: 'UNDER REVIEW',  progress: 40, color: 'var(--secondary)' },
  ]

  return (
    <div className="space-y-10">
      {/* Greeting — Stitch "Ambitious Discovery" style */}
      <section>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-black text-on-surface tracking-tight"
        >
          Namaste, Dhruv 👋
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-on-surface-variant mt-2 max-w-xl flex items-center gap-3 flex-wrap"
        >
          Your profile is at{' '}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-display font-bold text-sm"
            style={{ background: 'color-mix(in srgb, var(--primary-container) 15%, transparent)', color: 'var(--primary-container)' }}
          >
            85% strength
          </span>
          <span className="text-on-surface-variant">·</span>
          <span className="text-sm" style={{ color: 'var(--tertiary)' }}>
            Top 5% of candidates this week
          </span>
        </motion.p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main column */}
        <section className="lg:col-span-8 space-y-6">
          {/* Category tiles */}
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
                    {t.count} jobs
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Top match highlight */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-display font-bold text-on-surface">Top Matches</h2>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card glass-card-hover p-7 rounded-3xl relative overflow-hidden mb-4 cursor-pointer"
              onClick={() => handleNavigate('discover')}
            >
              {/* Background glow */}
              <div
                className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 blur-2xl pointer-events-none"
                style={{ background: 'var(--primary-container)', transform: 'translate(30%, -30%)' }}
              />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-xl border border-outline-variant"
                    style={{ background: 'var(--surface-container-highest)', color: '#3b82f6' }}
                  >
                    R
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold uppercase tracking-widest text-on-surface-variant">
                      Razorpay
                    </p>
                    <h3 className="text-xl font-display font-extrabold text-on-surface mt-0.5">
                      Backend Engineer
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Bengaluru · Remote Friendly
                    </p>
                  </div>
                </div>
                <div
                  className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-4 flex-shrink-0"
                  style={{ borderColor: '#22c55e', color: '#22c55e' }}
                >
                  <span className="font-display font-black text-lg leading-none">92%</span>
                  <span className="text-[8px] font-mono uppercase">match</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-5">
                {['Go', 'PostgreSQL', 'Kafka', 'Kubernetes'].map(s => (
                  <span
                    key={s}
                    className="badge"
                    style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)' }}
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="block font-display font-bold text-on-surface">₹28L–₹42L</span>
                    <span className="text-xs font-mono text-on-surface-variant">Salary</span>
                  </div>
                  <div>
                    <span className="block font-display font-bold text-on-surface">2 days ago</span>
                    <span className="text-xs font-mono text-on-surface-variant">Posted</span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); showToast('🎉 Applied to Razorpay!') }}
                  className="btn-primary"
                >
                  Quick Apply
                </button>
              </div>
            </motion.div>

            {/* Secondary matches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedJobs.slice(1).map((job, i) => (
                <motion.div
                  key={job.title + i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="glass-card glass-card-hover p-5 rounded-2xl cursor-pointer"
                  onClick={() => handleNavigate('discover')}
                >
                  <div className="flex justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-sm border border-outline-variant"
                      style={{ background: 'var(--surface-container-highest)', color: job.color }}
                    >
                      {job.logo}
                    </div>
                    <span
                      className="badge"
                      style={{ background: 'color-mix(in srgb, #22c55e 15%, transparent)', color: '#22c55e', border: '1px solid #22c55e44' }}
                    >
                      {job.match}% match
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-on-surface">{job.title}</h4>
                  <p className="text-xs text-on-surface-variant mt-1">{job.company} · {job.location}</p>
                  <p className="text-xs font-mono font-bold mt-3" style={{ color: 'var(--primary-container)' }}>
                    {job.salary}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Profile strength */}
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="font-display font-bold text-lg text-on-surface mb-5">Profile Strength</h3>
            <div className="flex items-center gap-5 mb-5">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-container-highest)" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="var(--primary-container)" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="213.6"
                    strokeDashoffset="42.7"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display font-black text-lg text-on-surface">80%</span>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-snug">
                You&apos;re in the <strong className="text-on-surface">top 10%</strong> of candidates in your domain.
              </p>
            </div>
            <div className="space-y-2.5">
              {[
                { text: 'AI/ML Experience added', done: true },
                { text: 'GitHub linked', done: true },
                { text: 'Add certifications (+10%)', done: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: item.done ? 'var(--tertiary)' : 'transparent',
                      border: item.done ? 'none' : '2px solid var(--outline-variant)',
                    }}
                  >
                    {item.done && <CheckCircle className="w-3.5 h-3.5 text-on-tertiary" />}
                  </div>
                  <span className={item.done ? 'text-on-surface' : 'text-on-surface-variant'}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleNavigate('profile')}
              className="w-full mt-5 btn-ghost"
            >
              Edit Profile
            </button>
          </div>

          {/* Active applications */}
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display font-bold text-lg text-on-surface">Applications</h3>
              <span
                className="badge"
                style={{ background: 'color-mix(in srgb, var(--secondary) 15%, transparent)', color: 'var(--secondary)', border: '1px solid color-mix(in srgb, var(--secondary) 30%, transparent)' }}
              >
                {applications.length} Active
              </span>
            </div>
            <div className="space-y-3">
              {applications.map((app, i) => (
                <button
                  key={i}
                  onClick={() => showToast(`${app.company} update: ${app.status}`, 'info')}
                  className="w-full p-4 rounded-xl border border-outline-variant text-left transition-colors hover:bg-surface-container-high"
                  style={{ background: 'var(--surface-container-low)' }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-display font-bold text-sm text-on-surface">{app.company}</span>
                    <span className="text-[9px] font-mono font-bold" style={{ color: app.color }}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-3">{app.role}</p>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-container-highest)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${app.progress}%`, background: app.color }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Startups Hiring — from Stitch home dashboard */}
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="font-display font-bold text-lg text-on-surface mb-5">Startups Hiring</h3>
            <div className="space-y-3">
              {[
                { name: 'Jupiter', roles: 12, color: '#f59e0b', letter: 'J' },
                { name: 'PhysicsWallah', roles: 8, color: '#6366f1', letter: 'P' },
                { name: 'Zepto', roles: 14, color: '#22c55e', letter: 'Z' },
              ].map((startup) => (
                <button
                  key={startup.name}
                  onClick={() => handleNavigate('discover')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-surface-container-high text-left"
                  style={{ background: 'var(--surface-container-low)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-sm flex-shrink-0 border border-outline-variant"
                    style={{ background: 'var(--surface-container-highest)', color: startup.color }}
                  >
                    {startup.letter}
                  </div>
                  <div className="flex-1">
                    <span className="font-display font-bold text-sm text-on-surface">{startup.name}</span>
                    <span className="block text-xs font-mono mt-0.5" style={{ color: startup.color }}>
                      {startup.roles} Open Roles
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
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
