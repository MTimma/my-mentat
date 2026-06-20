import { dreadnoughtStrengthEach } from '../data/leaderAbilities/rhomburDreadnoughtStrength'
import type { GameState } from '../types/GameTypes'

/** Total combat strength for a player (troops×2 + dreadnoughts×N + swords). */
export function computeStrength(state: GameState, playerId: number): number {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return 0

  const troops = state.combatTroops?.[playerId] ?? 0
  const negotiators = state.combatNegotiators?.[playerId] ?? 0
  const riseOfIx = state.expansions?.riseOfIx === true
  const dCount = riseOfIx ? (player.dreadnoughts?.conflict ?? 0) : 0

  if (riseOfIx) {
    if (troops + negotiators + dCount === 0) return 0
  } else if (troops === 0) {
    return 0
  }

  if (player.combatValue) return player.combatValue
  if (state.combatStrength[playerId]) return state.combatStrength[playerId]

  let total = (troops + negotiators) * 2
  if (riseOfIx && dCount > 0) {
    total += dCount * dreadnoughtStrengthEach(player.leader)
  }
  return total
}
