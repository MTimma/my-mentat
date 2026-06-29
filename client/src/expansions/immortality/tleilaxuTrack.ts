import type { TleilaxuTrackSpace } from './types'

/**
 * Linear Tleilaxu (beetle) track. The token starts at step 0 and advances
 * rightward; each entered space grants its bonus. One space awards a Victory
 * Point and carries the 2-spice first-player setup bonus.
 *
 * Logging-tool note: bonuses approximate the printed track and are not
 * load-bearing. Tune freely.
 */
export const TLEILAXU_TRACK: TleilaxuTrackSpace[] = [
  { step: 0 },
  { step: 1, bonus: { spice: 1 } },
  { step: 2, bonus: { solari: 2 } },
  { step: 3, bonus: { troops: 1 } },
  // VP space — first player to reach it also takes the 2 setup spice.
  { step: 4, bonus: { victoryPoints: 1 }, victoryPoint: true },
  { step: 5, bonus: { intrigueCards: 1 } },
  { step: 6, bonus: { drawCards: 1 } },
  { step: 7, bonus: { specimen: 1 } },
  { step: 8, bonus: { victoryPoints: 1 }, victoryPoint: true },
]

export const TLEILAXU_TRACK_MAX_STEP = TLEILAXU_TRACK.length - 1

export function tleilaxuSpace(step: number): TleilaxuTrackSpace | undefined {
  return TLEILAXU_TRACK[step]
}

export function clampTleilaxuStep(step: number): number {
  return Math.max(0, Math.min(TLEILAXU_TRACK_MAX_STEP, step))
}
