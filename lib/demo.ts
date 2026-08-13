/** Demo/mock UI fallbacks — opt in via NEXT_PUBLIC_DEMO_MODE=true (local demos only). */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}
