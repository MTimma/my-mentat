import type { Player } from '../types/GameTypes'

/** Rise of Ix — dreadnoughts per player (optional until expansion is wired). */
export interface PlayerDreadnoughts {
  supply: number
  garrison: number
  conflict: number
}

export function getDreadnoughtsInConflict(player: Player): number {
  return player.dreadnoughts?.conflict ?? 0
}
