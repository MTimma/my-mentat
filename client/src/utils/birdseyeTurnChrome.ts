import type { Gain, GameState, Player } from '../types/GameTypes'
import {
  getGainsForTurnState,
  getOtherPlayersGainsForTurnState,
  getTroopsDeployedToConflict,
  getTroopsRetreatedFromConflict,
  isCombatHistoryEntry,
  isEndgameHistoryEntry,
} from './turnGainsDisplay'

/** Per-seat gains for birds-eye combat chrome (active + incidental other-player). */
export function buildBirdseyeGainsByPlayer(turn: GameState): Record<number, Gain[]> {
  if (isCombatHistoryEntry(turn) || isEndgameHistoryEntry(turn)) {
    const byPlayer: Record<number, Gain[]> = {}
    for (const gain of turn.gains ?? []) {
      if (gain.amount === 0) continue
      ;(byPlayer[gain.playerId] ??= []).push(gain)
    }
    return byPlayer
  }

  const byPlayer: Record<number, Gain[]> = {}
  const activeId = turn.currTurn?.playerId ?? turn.activePlayerId
  const activeGains = getGainsForTurnState(turn)
  if (activeGains.length > 0) byPlayer[activeId] = activeGains

  for (const group of getOtherPlayersGainsForTurnState(turn)) {
    if (group.gains.length > 0) byPlayer[group.playerId] = group.gains
  }
  return byPlayer
}

export function birdseyeTroopDeployCounts(turn: GameState): {
  deployed: number
  retreated: number
} {
  if (isCombatHistoryEntry(turn) || isEndgameHistoryEntry(turn)) {
    return { deployed: 0, retreated: 0 }
  }
  return {
    deployed: getTroopsDeployedToConflict(turn),
    retreated: getTroopsRetreatedFromConflict(turn),
  }
}

export function birdseyeTechCount(player: Player | null | undefined): number {
  return player?.tech?.length ?? 0
}
