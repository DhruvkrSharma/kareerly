'use client'

import { useEffect, useState, useCallback } from 'react'
import { FeedStack } from '@/components/feed/SwipeCard'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { FeedCard, SwipeAction } from '@/lib/types'

export default function FeedPage() {
  const [cards, setCards] = useState<FeedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId] = useState(() => crypto.randomUUID())
  const router = useRouter()

  useEffect(() => { fetchFeed() }, [])

  async function fetchFeed() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/feed')
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
  }

  const handleSwipe = useCallback(async (cardIndex: number, action: SwipeAction) => {
    const card = cards[cardIndex]
    if (!card) return
    fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: card.job_id, rec_id: card.rec_id, action, session_id: sessionId }),
    }).catch(console.error)
  }, [cards, sessionId])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #1f2937',
        position: 'sticky', top: 0, background: '#030712', zIndex: 50,
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>
          Kareerly
        </h1>
        <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="/saved" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
            Saved
          </a>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px' }}
          >
            Sign out
          </button>
        </nav>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>
        {error ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={fetchFeed}
              style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : (
          <FeedStack cards={cards} onSwipe={handleSwipe} loading={loading} />
        )}
      </main>
    </div>
  )
}
