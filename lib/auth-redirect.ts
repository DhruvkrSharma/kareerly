/** Validate post-auth redirect targets — blocks open redirects. */
export function getSafeRedirectPath(next: string | null, fallback = '/feed'): string {
  if (!next) return fallback
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  if (next.includes(':\\') || next.includes('://')) return fallback
  return next
}
