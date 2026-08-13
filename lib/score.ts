/** Format a 0..1 match score as a display percentage. */
export function scoreToPercent(score: number): number {
  return score <= 1 ? Math.round(score * 100) : Math.round(score)
}
