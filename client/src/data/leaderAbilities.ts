import { GameState, FactionType, PendingReward, GainSource } from '../types/GameTypes'
import { LEADER_NAMES } from './leaders'
import { updateFactionInfluence } from '../utils/influenceVictoryPoints'

/**
 * Check and apply Vladimir's Masterstroke ability when 4+ troops are deployed in a turn.
 * Returns updated state if Masterstroke was triggered, otherwise returns the same state.
 */
export function checkAndApplyMasterstroke(
  state: GameState,
  playerId: number
): GameState {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return state

  const leader = player.leader
  if (leader.name !== LEADER_NAMES.BARON_VLADIMIR) return state

  const masterStroke = (leader as { masterStroke?: { triggered: boolean } })
    .masterStroke
  if (!masterStroke || masterStroke.triggered) return state

  const removableTroops = state.currTurn?.removableTroops ?? 0
  if (removableTroops < 4) return state

  const rewardId = `masterstroke-${crypto.randomUUID()}`
  const pendingReward: PendingReward = {
    id: rewardId,
    source: { type: GainSource.MASTERSTROKE, id: 0, name: 'Masterstroke' },
    reward: {
      influence: { amounts: [] },
    },
    isTrash: false,
  }

  const updatedLeader = {
    ...leader,
    masterStroke: { ...masterStroke, triggered: true },
  }

  const pendingRewards = [...state.pendingRewards, pendingReward]
  return {
    ...state,
    pendingRewards,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, leader: updatedLeader } : p
    ),
    canEndTurn:
      pendingRewards.filter((r) => !r.disabled).length === 0 &&
      !(state.currTurn?.pendingChoices?.length) &&
      state.currTurn?.opponentDiscardState === undefined,
  }
}

/**
 * Revert Masterstroke when player retreats and drops below 4 troops.
 * Removes pending reward, clears gains, and reverts faction influence.
 */
export function revertMasterstrokeIfNeeded(
  state: GameState,
  playerId: number
): GameState {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return state

  const leader = player.leader
  if (leader.name !== LEADER_NAMES.BARON_VLADIMIR) return state

  const masterStroke = (leader as { masterStroke?: { factions?: FactionType[]; triggered: boolean } })
    .masterStroke
  if (!masterStroke || !masterStroke.triggered) return state

  const removableTroops = state.currTurn?.removableTroops ?? 0
  if (removableTroops >= 4) return state

  const hasMasterstrokeGains = state.gains.some(
    (g) =>
      g.source === GainSource.MASTERSTROKE &&
      g.playerId === playerId &&
      g.round === state.currentRound
  )
  const hasMasterstrokePending = state.pendingRewards.some(
    (r) => r.source.name === 'Masterstroke'
  )

  if (!hasMasterstrokeGains && !hasMasterstrokePending) return state

  let newState = { ...state }

  if (hasMasterstrokeGains) {
    const masterstrokeGains = newState.gains.filter(
      (g) =>
        g.source === GainSource.MASTERSTROKE &&
        g.playerId === playerId &&
        g.round === state.currentRound
    )
    for (const g of masterstrokeGains) {
      newState = updateFactionInfluence(newState, g.name as FactionType, playerId, -g.amount)
    }
    newState = {
      ...newState,
      gains: newState.gains.filter(
        (g) =>
          !(
            g.source === GainSource.MASTERSTROKE &&
            g.playerId === playerId &&
            g.round === state.currentRound
          )
      ),
    }
  }

  if (hasMasterstrokePending) {
    newState = {
      ...newState,
      pendingRewards: newState.pendingRewards.filter(
        (r) => r.source.name !== 'Masterstroke'
      ),
    }
  }

  const updatedLeader = {
    ...leader,
    masterStroke: { ...masterStroke, triggered: false },
  }

  const withPlayers = {
    ...newState,
    players: newState.players.map((p) =>
      p.id === playerId ? { ...p, leader: updatedLeader } : p
    ),
  }

  return {
    ...withPlayers,
    canEndTurn:
      withPlayers.pendingRewards.filter((r) => !r.disabled).length === 0 &&
      !(withPlayers.currTurn?.pendingChoices?.length) &&
      withPlayers.currTurn?.opponentDiscardState === undefined,
  }
}
