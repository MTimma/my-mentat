/**
 * Display place for the live combat rank strip.
 * Same walk as `getPlacements4p` in GameContext:
 * - tie for 1st → 2nd reward (no unique winner)
 * - tie for 2nd → 3rd reward
 * - tie for 3rd → nothing (place 4)
 *
 * `fieldStrengths` is every in-combat strength (same field for each call).
 */
export function combatRewardPlace(strength: number, fieldStrengths: readonly number[]): number {
  const uniqueDesc = [...new Set(fieldStrengths)].sort((a, b) => b - a)
  let contested = 1
  for (const value of uniqueDesc) {
    const tied = fieldStrengths.filter(s => s === value).length > 1
    let place: number
    let next = contested
    if (contested === 1) {
      place = tied ? 2 : 1
      next = tied ? 3 : 2
    } else if (contested === 2) {
      place = tied ? 3 : 2
      next = tied ? 4 : 3
    } else if (contested === 3) {
      place = tied ? 4 : 3
      next = 4
    } else {
      place = 4
      next = 5
    }
    if (value === strength) return place
    contested = next
  }
  return 4
}
