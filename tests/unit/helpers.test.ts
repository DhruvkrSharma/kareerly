import { describe, it, expect } from 'vitest'
import { getSafeRedirectPath } from '../../lib/auth-redirect'
import { scoreToPercent } from '../../lib/score'

describe('getSafeRedirectPath', () => {
  it('returns fallback for missing path', () => {
    expect(getSafeRedirectPath(null)).toBe('/feed')
  })

  it('allows internal paths', () => {
    expect(getSafeRedirectPath('/onboarding')).toBe('/onboarding')
  })

  it('blocks protocol-relative open redirects', () => {
    expect(getSafeRedirectPath('//evil.com')).toBe('/feed')
  })

  it('blocks absolute URLs', () => {
    expect(getSafeRedirectPath('https://evil.com')).toBe('/feed')
  })
})

describe('scoreToPercent', () => {
  it('converts 0..1 scores to percentages', () => {
    expect(scoreToPercent(0.85)).toBe(85)
  })

  it('passes through already-percent values', () => {
    expect(scoreToPercent(92)).toBe(92)
  })
})
