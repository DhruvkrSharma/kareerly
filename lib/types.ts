export interface FeedCard {
  rec_id: number
  job_id: number
  title: string
  company_name: string
  company_logo: string | null
  location: string | null
  remote_ok: boolean
  score: number
  confidence: number
  tier: 1 | 2 | 3 | 4
  score_factors: Record<string, number>
  apply_url: string | null
}

export type SwipeAction = 'apply' | 'save' | 'reject'

export const TIER_LABELS: Record<number, string> = {
  1: 'Top match',
  2: 'Good fit',
  3: 'New listing',
  4: 'Revisit',
}

export const TIER_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#f59e0b',
  4: '#8b5cf6',
}