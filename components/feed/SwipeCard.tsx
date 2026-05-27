'use client'

import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { MapPin, Sparkles, Building2, ExternalLink, X, Bookmark, Heart } from 'lucide-react'
import type { FeedCard, SwipeAction } from '@/lib/types'

const TIER_LABELS: Record<number, string> = {
  1: 'Top Match', 2: 'Great Fit', 3: 'New Listing', 4: 'Explore',
}
const TIER_COLORS: Record<number, string> = {
  1: '#22c55e', 2: '#3b82f6', 3: '#f59e0b', 4: '#a855f7',
}

/* ── Single swipe card ──────────────────────────────────────── */
interface CardProps {
  card: FeedCard
  onSwipe: (action: SwipeAction) => void
  isTop: boolean
  index: number
}

export function SwipeCard({ card, onSwipe, isTop, index }: CardProps) {
  const x = useMotionValue(0)
  const rotate   = useTransform(x, [-220, 220], [-18, 18])
  const opacity  = useTransform(x, [-220, -100, 0, 100, 220], [0, 1, 1, 1, 0])
  const applyOp  = useTransform(x, [0, 80],  [0, 1])
  const skipOp   = useTransform(x, [-80, 0], [1, 0])
  const pct      = Math.round(card.score * 100)
  const tierColor = TIER_COLORS[card.tier] ?? '#f59e0b'

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 110)       onSwipe('apply')
    else if (info.offset.x < -110) onSwipe('reject')
  }

  return (
    <motion.div
      style={{
        x, rotate, opacity,
        position: 'absolute',
        width: '100%',
        zIndex: 10 - index,
        top: `${index * 10}px`,
        cursor: isTop ? 'grab' : 'default',
        userSelect: 'none',
      }}
      animate={{ scale: 1 - index * 0.04, top: `${index * 10}px` }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      initial={{ opacity: 0, scale: 0.88 }}
      exit={{ opacity: 0, x: 500, rotate: 25, transition: { duration: 0.35 } }}
    >
      {/* Stamps */}
      {isTop && (
        <>
          <motion.div style={{ opacity: applyOp }} className="stamp-apply">APPLY ✓</motion.div>
          <motion.div style={{ opacity: skipOp  }} className="stamp-skip">SKIP ✕</motion.div>
        </>
      )}

      {/* Card body */}
      <div
        className="rounded-4xl overflow-hidden flex flex-col shadow-2xl"
        style={{
          background: 'var(--surface-container-low)',
          border: '1px solid var(--outline-variant)',
          minHeight: '440px',
        }}
      >
        {/* Coloured header banner */}
        <div
          className="relative px-6 pt-7 pb-5"
          style={{
            background: `linear-gradient(135deg, ${tierColor}22 0%, color-mix(in srgb, var(--surface-container-high) 60%, ${tierColor}11) 100%)`,
            borderBottom: `1px solid ${tierColor}33`,
          }}
        >
          {/* Tier badge */}
          <span
            className="badge mb-3"
            style={{ background: `${tierColor}22`, color: tierColor, border: `1px solid ${tierColor}44` }}
          >
            ✦ {TIER_LABELS[card.tier]}
          </span>

          <div className="flex items-center gap-4">
            {/* Logo */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border border-outline-variant/50 text-xl font-display font-black"
              style={{ background: 'var(--surface-container-highest)', color: tierColor }}
            >
              {card.company_logo
                ? <img src={card.company_logo} alt="" className="w-full h-full object-contain rounded-2xl" />
                : (card.company_name ?? 'J').charAt(0)
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-on-surface-variant">
                {card.company_name ?? 'Company'}
              </p>
              <h2
                className="text-xl font-display font-extrabold text-on-surface leading-tight mt-0.5"
                style={{ lineHeight: '1.2' }}
              >
                {card.title}
              </h2>
            </div>
          </div>

          {/* Location + remote */}
          {card.location && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-on-surface-variant font-medium">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {card.remote_ok ? '🌐 Remote · ' : '📍 '}{card.location}
            </div>
          )}
        </div>

        {/* Match score */}
        <div className="px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-widest">
                AI Match Score
              </span>
            </div>
            <span className="font-display font-black text-lg" style={{ color: tierColor }}>
              {pct}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--surface-container-highest)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: pct > 75
                  ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                  : pct > 50
                    ? 'linear-gradient(90deg,#3b82f6,#2563eb)'
                    : 'linear-gradient(90deg,#f59e0b,#d97706)',
              }}
            />
          </div>

          {/* Score factors */}
          {card.score_factors && Object.keys(card.score_factors).length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
              {Object.entries(card.score_factors)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([key, val]) => (
                  <span
                    key={key}
                    className="badge"
                    style={{
                      background: 'var(--surface-container)',
                      color: 'var(--on-surface-variant)',
                      border: '1px solid var(--outline-variant)',
                    }}
                  >
                    {key.replace(/_/g, ' ')} · {Math.round(val * 100)}%
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Magic AI Insights — from Stitch Job Swipe design */}
        {pct > 60 && (
          <div className="px-6 py-4 border-b border-outline-variant/40">
            <div className="ai-shimmer px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--secondary)' }} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--secondary)' }}>
                  Magic AI Insights
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {pct > 85
                  ? `Your deep expertise makes you a top 3% candidate for this role.`
                  : pct > 70
                    ? `Strong alignment with role requirements. Great potential fit.`
                    : `Interesting opportunity with growing skill overlap.`
                }
              </p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[
                  pct > 80 ? 'Perfect Fit' : 'Growing Fit',
                  card.tier === 1 ? 'High Priority' : 'Worth Exploring',
                ].map(tag => (
                  <span
                    key={tag}
                    className="badge"
                    style={{
                      background: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                      color: 'var(--secondary)',
                      border: '1px solid color-mix(in srgb, var(--secondary) 30%, transparent)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-6 py-3 mt-auto flex items-center justify-between"
          style={{ background: 'var(--surface-container)' }}
        >
          <span className="text-xs font-mono text-on-surface-variant">
            Confidence: {Math.round(card.confidence * 100)}%
          </span>
          {card.apply_url && (
            <a
              href={card.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs font-mono font-bold transition-colors hover:text-primary"
              style={{ color: 'var(--primary-container)' }}
            >
              View job <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Action buttons ─────────────────────────────────────────── */
interface ActionProps {
  onAction: (action: SwipeAction) => void
  disabled?: boolean
}

export function ActionButtons({ onAction, disabled }: ActionProps) {
  const btn = (
    action: SwipeAction,
    icon: React.ReactNode,
    bg: string,
    label: string,
  ) => (
    <button
      onClick={() => onAction(action)}
      disabled={disabled}
      title={label}
      className="flex flex-col items-center gap-1.5 group"
      style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all"
        style={{
          background: bg,
          borderColor: 'transparent',
          boxShadow: `0 4px 16px ${bg}55`,
          transform: 'scale(1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      >
        {icon}
      </div>
      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
    </button>
  )

  return (
    <div className="flex justify-center items-end gap-8 mt-6">
      {btn('reject',  <X        className="w-6 h-6 text-white" />, '#ef4444', 'Skip')}
      {btn('save',    <Bookmark className="w-6 h-6 text-white" />, '#f59e0b', 'Save')}
      {btn('apply',   <Heart    className="w-6 h-6 text-white" />, '#22c55e', 'Apply')}
    </div>
  )
}

/* ── Feed stack ─────────────────────────────────────────────── */
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

  if (loading) return (
    <div className="flex flex-col items-center gap-4 py-24 text-on-surface-variant">
      <div
        className="w-10 h-10 rounded-full border-2 border-t-primary animate-spin-slow"
        style={{ borderColor: 'var(--outline-variant)', borderTopColor: 'var(--primary-container)' }}
      />
      <p className="text-sm font-mono">Loading your feed…</p>
    </div>
  )

  if (topIndex >= cards.length) return (
    <div className="flex flex-col items-center gap-4 py-24 text-center text-on-surface-variant">
      <div className="text-6xl animate-float">◎</div>
      <h3 className="font-display font-extrabold text-2xl text-on-surface">All caught up!</h3>
      <p className="text-sm font-mono max-w-xs">
        New jobs are added every few hours.<br />Check back soon.
      </p>
    </div>
  )

  const visible = cards.slice(topIndex, topIndex + 3)

  return (
    <div className="flex flex-col items-center w-full max-w-[420px] mx-auto">
      <div className="relative w-full" style={{ height: '460px' }}>
        <AnimatePresence>
          {visible.map((card, i) => (
            <SwipeCard
              key={`${card.rec_id}-${card.job_id}`}
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
