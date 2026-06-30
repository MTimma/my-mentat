import { dreadnoughtStrengthEach } from '../data/leaderAbilities/rhomburDreadnoughtStrength'
import { GamePhase, TurnType, type GameState } from '../types/GameTypes'

/** Reveal/combat phases track swords on combatValue; agent-turn deploy uses units only. */
function shouldUseCachedCombatValue(state: GameState, playerId: number): boolean {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return false
  if (player.revealed || state.currTurn?.type === TurnType.REVEAL) return true
  return (
    state.phase === GamePhase.COMBAT ||
    state.phase === GamePhase.COMBAT_REWARDS ||
    state.phase === GamePhase.END_GAME
  )
}

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

  if (shouldUseCachedCombatValue(state, playerId) && player.combatValue) {
    return player.combatValue
  }
  if (shouldUseCachedCombatValue(state, playerId) && state.combatStrength[playerId]) {
    return state.combatStrength[playerId]
  }

  let total = (troops + negotiators) * 2
  if (riseOfIx && dCount > 0) {
    total += dCount * dreadnoughtStrengthEach(player.leader)
  }
  return total
}
