'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FeedStack } from '@/components/feed/SwipeCard'
import { Toast } from '@/components/ui/Navigation'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import type { FeedCard, SwipeAction } from '@/lib/types'

export default function DiscoverPage() {
  const [cards, setCards] = useState<FeedCard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null)
  const [sessionId] = useState(() => crypto.randomUUID())
  const router = useRouter()

  function showToast(message: string, type: 'success' | 'info' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/feed')
      if (res.status === 401) { router.push('/auth/login'); return }
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setCards(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  const handleSwipe = useCallback(async (cardIndex: number, action: SwipeAction) => {
    const card = cards[cardIndex]
    if (!card) return
    const msgs: Record<SwipeAction, string> = {
      apply: card.apply_url ? 'Opening job in new tab...' : 'Job link unavailable',
      save:  '★ Saved for later.',
      reject: 'Skipped.',
    }
    showToast(msgs[action], action === 'apply' && card.apply_url ? 'success' : 'info')
    
    if (action === 'apply' && card.apply_url) {
      window.open(card.apply_url, '_blank', 'noopener,noreferrer')
    }
    authFetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: card.job_id, rec_id: card.rec_id,
        action, session_id: sessionId,
      }),
    }).catch(console.error)
  }, [cards, sessionId])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      {error ? (
        <div className="text-center py-16">
          <p className="text-error mb-4">{error}</p>
          <button onClick={fetchFeed} className="btn-primary">Retry</button>
        </div>
      ) : (
        <FeedStack cards={cards} onSwipe={handleSwipe} loading={loading} />
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
