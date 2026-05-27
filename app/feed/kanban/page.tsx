'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MapPin, ExternalLink, Calendar, ArrowRight, Check } from 'lucide-react'
import { Toast } from '@/components/ui/Navigation'
import { useRouter } from 'next/navigation'

interface KanbanCard {
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

type ColumnId = 'saved' | 'applied' | 'interviewing' | 'closed'

const MOCK_CARDS: KanbanCard[] = [
  {
    rec_id: 101,
    job_id: 201,
    title: 'Senior Frontend Engineer',
    company_name: 'TechCorp Inc.',
    company_logo: null,
    location: 'Bengaluru · Hybrid',
    remote_ok: false,
    score: 94,
    confidence: 0.9,
    tier: 1,
    swipe_action: 'save',
    swiped_at: new Date().toISOString(),
    apply_url: 'https://techcorp.example.com',
    skills: ['React', 'TypeScript']
  },
  {
    rec_id: 102,
    job_id: 202,
    title: 'Product Designer',
    company_name: 'Innovate Studio',
    company_logo: null,
    location: 'Remote',
    remote_ok: true,
    score: 88,
    confidence: 0.85,
    tier: 2,
    swipe_action: 'save',
    swiped_at: new Date().toISOString(),
    apply_url: 'https://innovate.example.com',
    skills: ['Figma', 'Design Systems']
  },
  {
    rec_id: 103,
    job_id: 203,
    title: 'Full Stack Developer',
    company_name: 'Global FinTech',
    company_logo: null,
    location: 'Mumbai',
    remote_ok: false,
    score: 91,
    confidence: 0.88,
    tier: 1,
    swipe_action: 'apply',
    swiped_at: new Date().toISOString(),
    apply_url: 'https://fintech.example.com',
    skills: ['Node.js', 'React']
  }
]

export default function KanbanPage() {
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [loading, setLoading] = useState(true)
  // Local stage overrides: maps rec_id -> ColumnId
  const [stageOverrides, setStageOverrides] = useState<Record<number, ColumnId>>({})
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null)
  const router = useRouter()

  function showToast(message: string, type: 'success' | 'info' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    // Load overrides from localStorage
    const savedOverrides = localStorage.getItem('kareerly-kanban-stages')
    if (savedOverrides) {
      try {
        setStageOverrides(JSON.parse(savedOverrides))
      } catch (e) {
        console.error(e)
      }
    }
    fetchCards()
  }, [])

  async function fetchCards() {
    setLoading(true)
    try {
      const res = await fetch('/api/saved')
      if (res.status === 401) {
        router.push('/auth/login')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      
      if (json.data && json.data.length > 0) {
        setCards(json.data)
      } else {
        setCards(MOCK_CARDS)
      }
    } catch (err) {
      console.error(err)
      setCards(MOCK_CARDS)
    } finally {
      setLoading(false)
    }
  }

  // Update card pipeline stage
  async function updateStage(recId: number, jobId: number, newStage: ColumnId) {
    const updatedOverrides = { ...stageOverrides, [recId]: newStage }
    setStageOverrides(updatedOverrides)
    localStorage.setItem('kareerly-kanban-stages', JSON.stringify(updatedOverrides))

    showToast(`Moved to ${newStage.charAt(0).toUpperCase() + newStage.slice(1)}`)

    // If moved to "applied", trigger database update
    if (newStage === 'applied') {
      try {
        await fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: jobId,
            rec_id: recId,
            action: 'apply'
          })
        })
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Group cards into columns
  const getColumnCards = (colId: ColumnId) => {
    return cards.filter(card => {
      const override = stageOverrides[card.rec_id]
      if (override) {
        return override === colId
      }
      // Defaults:
      if (colId === 'saved') return card.swipe_action === 'save'
      if (colId === 'applied') return card.swipe_action === 'apply'
      return false
    })
  }

  const columns = [
    { id: 'saved' as ColumnId, title: 'Bookmarked', color: 'var(--primary-container)' },
    { id: 'applied' as ColumnId, title: 'Applied', color: 'var(--secondary)' },
    { id: 'interviewing' as ColumnId, title: 'Interviewing', color: 'var(--tertiary)' },
    { id: 'closed' as ColumnId, title: 'Closed', color: 'var(--outline)' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-on-surface tracking-tight">
            Pipeline Board
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Drag, tap, and track your active job applications
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-4 border-primary-container border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-6 pt-2" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {columns.map(col => {
            const colCards = getColumnCards(col.id)
            return (
              <div 
                key={col.id} 
                className="flex flex-col gap-4 min-w-[300px] max-w-[340px] flex-1 rounded-2xl p-4"
                style={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)' }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                    <h3 className="font-display font-black text-sm text-on-surface">
                      {col.title}
                    </h3>
                    <span
                      className="badge px-2 py-0.5 rounded-md text-xs font-mono font-bold"
                      style={{
                        background: 'var(--surface-container-highest)',
                        color: 'var(--on-surface-variant)',
                      }}
                    >
                      {colCards.length}
                    </span>
                  </div>
                </div>

                {/* Cards stack */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {colCards.map(card => (
                      <motion.div
                        key={card.rec_id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="glass-card p-4 rounded-xl relative overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2.5">
                            <span className="text-xs font-mono font-bold text-on-surface-variant/70 uppercase">
                              {card.company_name}
                            </span>
                            <span 
                              className="badge text-[10px] px-1.5 py-0.5"
                              style={{ 
                                background: 'color-mix(in srgb, var(--primary-container) 10%, transparent)', 
                                color: 'var(--primary-container)' 
                              }}
                            >
                              {card.score}% match
                            </span>
                          </div>
                          
                          <h4 className="font-display font-black text-sm text-on-surface leading-tight line-clamp-1 mb-2">
                            {card.title}
                          </h4>

                          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{card.location}</span>
                          </div>

                          {/* Skill pills */}
                          <div className="flex flex-wrap gap-1 mt-3">
                            {card.skills.slice(0, 2).map(skill => (
                              <span 
                                key={skill} 
                                className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant/80 border border-outline-variant"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Interactive flow controls */}
                        <div className="flex items-center justify-between border-t border-outline-variant/30 mt-4 pt-3">
                          <button
                            onClick={() => window.open(card.apply_url, '_blank')}
                            className="p-1.5 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 text-xs font-mono font-bold"
                          >
                            Apply <ExternalLink className="w-3 h-3" />
                          </button>

                          {/* Move stage control */}
                          <div className="flex gap-1">
                            {col.id === 'saved' && (
                              <button
                                onClick={() => updateStage(card.rec_id, card.job_id, 'applied')}
                                className="px-2 py-1 bg-primary-container text-on-primary-container rounded-lg text-[10px] font-bold flex items-center gap-1 hover:brightness-95 transition-all"
                              >
                                Applied <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {col.id === 'applied' && (
                              <button
                                onClick={() => updateStage(card.rec_id, card.job_id, 'interviewing')}
                                className="px-2 py-1 bg-tertiary-container text-on-tertiary-container rounded-lg text-[10px] font-bold flex items-center gap-1 hover:brightness-95 transition-all"
                              >
                                Interview <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {col.id === 'interviewing' && (
                              <button
                                onClick={() => updateStage(card.rec_id, card.job_id, 'closed')}
                                className="px-2 py-1 bg-outline-variant text-on-surface rounded-lg text-[10px] font-bold flex items-center gap-1 hover:brightness-95 transition-all"
                              >
                                Close <Check className="w-3 h-3" />
                              </button>
                            )}
                            {col.id === 'closed' && (
                              <button
                                onClick={() => updateStage(card.rec_id, card.job_id, 'saved')}
                                className="px-2 py-1 bg-surface-container-highest text-on-surface-variant rounded-lg text-[10px] font-bold hover:brightness-95 transition-all"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {colCards.length === 0 && (
                    <div
                      className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed p-6 min-h-[120px]"
                      style={{ borderColor: 'var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
                    >
                      <p className="text-xs text-on-surface-variant text-center leading-normal">
                        No roles in this stage
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
