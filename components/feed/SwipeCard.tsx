'use client'

import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { FeedCard, SwipeAction } from '@/lib/types'
import { TIER_LABELS, TIER_COLORS } from '@/lib/types'

interface Props {
  card: FeedCard
  onSwipe: (action: SwipeAction) => void
  isTop: boolean
  index: number
}

export function SwipeCard({ card, onSwipe, isTop, index }: Props) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])
  const applyOpacity = useTransform(x, [0, 80], [0, 1])
  const rejectOpacity = useTransform(x, [-80, 0], [1, 0])
  const matchPct = Math.round(card.score * 100)

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 100) onSwipe('apply')
    else if (info.offset.x < -100) onSwipe('reject')
  }

  return (
    <motion.div
      style={{
        x,
        rotate,
        opacity,
        position: 'absolute',
        width: '100%',
        zIndex: 10 - index,
        top: `${index * 10}px`,
        scale: 1 - index * 0.04,
        cursor: isTop ? 'grab' : 'default',
        userSelect: 'none',
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1 - index * 0.04,
        top: `${index * 10}px`,
      }}
      exit={{ opacity: 0, x: 400, rotate: 20, transition: { duration: 0.3 } }}
    >
      {/* Stamps */}
      {isTop && (
        <>
          <motion.div style={{ opacity: applyOpacity, position: 'absolute', top: 20, left: 20, zIndex: 20, border: '3px solid #22c55e', borderRadius: '8px', padding: '4px 12px', color: '#22c55e', fontWeight: 700, fontSize: '20px', transform: 'rotate(-15deg)', pointerEvents: 'none' }}>
            APPLY
          </motion.div>
          <motion.div style={{ opacity: rejectOpacity, position: 'absolute', top: 20, right: 20, zIndex: 20, border: '3px solid #ef4444', borderRadius: '8px', padding: '4px 12px', color: '#ef4444', fontWeight: 700, fontSize: '20px', transform: 'rotate(15deg)', pointerEvents: 'none' }}>
            SKIP
          </motion.div>
        </>
      )}

      {/* Card */}
      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '20px',
        padding: '24px',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Company header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '12px',
            background: '#1f2937', border: '1px solid #374151',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: '700', color: '#6366f1', flexShrink: 0,
          }}>
            {card.company_logo
              ? <img src={card.company_logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
              : (card.company_name ?? 'J').charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
              {card.company_name ?? 'Unknown Company'}
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#fff', margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {card.title}
            </h2>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {card.location && (
            <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#1f2937', border: '1px solid #374151', color: '#9ca3af', fontSize: '12px' }}>
              {card.remote_ok ? '🌐 Remote · ' : '📍 '}{card.location}
            </span>
          )}
          <span style={{
            padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '500',
            background: TIER_COLORS[card.tier] + '22',
            color: TIER_COLORS[card.tier],
            border: `1px solid ${TIER_COLORS[card.tier]}44`,
          }}>
            {TIER_LABELS[card.tier]}
          </span>
        </div>

        {/* Match score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '6px', background: '#1f2937', borderRadius: '999px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${matchPct}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                style={{
                  height: '100%', borderRadius: '999px',
                  background: matchPct > 75 ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                    : matchPct > 50 ? 'linear-gradient(90deg,#3b82f6,#2563eb)'
                    : 'linear-gradient(90deg,#f59e0b,#d97706)',
                }}
              />
            </div>
            <span style={{ fontSize: '13px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
              {matchPct}% match
            </span>
          </div>

          {/* Score factors */}
          {card.score_factors && Object.keys(card.score_factors).length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.entries(card.score_factors)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([key, val]) => (
                  <span key={key} style={{
                    fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                    background: '#1f2937', color: '#6b7280', border: '1px solid #374151',
                    textTransform: 'capitalize',
                  }}>
                    {key.replace(/_/g, ' ')} · {Math.round(val * 100)}%
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Confidence */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#4b5563' }}>
            Confidence: {Math.round(card.confidence * 100)}%
          </span>
          {card.apply_url && (
            <a
              href={card.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none' }}
            >
              View job →
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Action Buttons ───────────────────────────────────────────────────────────
interface ActionProps {
  onAction: (action: SwipeAction) => void
  disabled?: boolean
}

export function ActionButtons({ onAction, disabled }: ActionProps) {
  const btn = (action: SwipeAction, emoji: string, color: string) => (
    <button
      onClick={() => onAction(action)}
      disabled={disabled}
      style={{
        width: '58px', height: '58px', borderRadius: '50%',
        border: `2px solid ${color}44`,
        background: '#111827', fontSize: '22px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = color + '22' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#111827' }}
    >
      {emoji}
    </button>
  )

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px' }}>
      {btn('reject', '✕', '#ef4444')}
      {btn('save', '★', '#f59e0b')}
      {btn('apply', '✓', '#22c55e')}
    </div>
  )
}

// ─── Feed Stack ───────────────────────────────────────────────────────────────
interface StackProps {
  cards: FeedCard[]
  onSwipe: (index: number, action: SwipeAction) => void
  loading?: boolean
}

export function FeedStack({ cards, onSwipe, loading }: StackProps) {
  const [topIndex, setTopIndex] = useState(0)

  function handleSwipe(action: SwipeAction) {
    onSwipe(topIndex, action)
    setTopIndex(i => i + 1)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 0', color: '#6b7280' }}>
        <div style={{ width: '36px', height: '36px', border: '2px solid #374151', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ margin: 0, fontSize: '14px' }}>Loading your feed…</p>
      </div>
    )
  }

  if (topIndex >= cards.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 0', color: '#6b7280', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', opacity: 0.4 }}>◎</div>
        <h3 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>All caught up</h3>
        <p style={{ margin: 0, fontSize: '14px' }}>New jobs are added every few hours.</p>
      </div>
    )
  }

  const visible = cards.slice(topIndex, topIndex + 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ position: 'relative', width: '100%', height: '460px' }}>
        <AnimatePresence>
          {visible.map((card, i) => (
            <SwipeCard
              key={`${card.rec_id}-${card.job_id}-${i}`}
              card={card}
              onSwipe={handleSwipe}
              isTop={i === 0}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>
      <ActionButtons onAction={handleSwipe} disabled={topIndex >= cards.length} />
    </div>
  )
}