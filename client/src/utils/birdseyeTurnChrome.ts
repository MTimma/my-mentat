import { GamePhase, GainSource, type Gain, type GameState, type Player } from '../types/GameTypes'
import {
  getGainsForTurnState,
  getOtherPlayersGainsForTurnState,
  getDreadnoughtsDeployedToConflict,
  getTroopsDeployedToConflict,
  getTroopsRetreatedFromConflict,
  isCombatHistoryEntry,
  isConflictRewardsHistoryEntry,
  isEndgameHistoryEntry,
} from './turnGainsDisplay'

function pushGain(byPlayer: Record<number, Gain[]>, gain: Gain): void {
  if (gain.amount === 0) return
  const list = (byPlayer[gain.playerId] ??= [])
  const duplicate = list.some(
    existing =>
      existing.source === gain.source &&
      existing.sourceId === gain.sourceId &&
      existing.name === gain.name &&
      existing.type === gain.type &&
      existing.amount === gain.amount &&
      existing.round === gain.round
  )
  if (duplicate) return
  list.push(gain)
}

/** Per-seat gains for birds-eye combat chrome (active + incidental other-player). */
export function buildBirdseyeGainsByPlayer(turn: GameState): Record<number, Gain[]> {
  if (
    isCombatHistoryEntry(turn) ||
    isConflictRewardsHistoryEntry(turn) ||
    isEndgameHistoryEntry(turn) ||
    turn.phase === GamePhase.COMBAT_REWARDS
  ) {
    const byPlayer: Record<number, Gain[]> = {}
    const conflictId = turn.currentConflict?.id
    const liveRewards = turn.phase === GamePhase.COMBAT_REWARDS && !isConflictRewardsHistoryEntry(turn)
    const activeRewardPlayer = turn.activePlayerId
    for (const gain of turn.gains ?? []) {
      if (liveRewards) {
        if (gain.playerId !== activeRewardPlayer) continue
        if (gain.source !== GainSource.CONFLICT) continue
        if (conflictId != null && gain.sourceId !== conflictId) continue
      }
      pushGain(byPlayer, gain)
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
  dreadnoughts: number
  retreated: number
} {
  if (isCombatHistoryEntry(turn) || isEndgameHistoryEntry(turn)) {
    return { deployed: 0, dreadnoughts: 0, retreated: 0 }
  }
  return {
    deployed: getTroopsDeployedToConflict(turn),
    dreadnoughts: getDreadnoughtsDeployedToConflict(turn),
    retreated: getTroopsRetreatedFromConflict(turn),
  }
}

export function birdseyeTechCount(player: Player | null | undefined): number {
  return player?.tech?.length ?? 0
}
