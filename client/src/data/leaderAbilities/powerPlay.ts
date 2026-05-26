import {
  CustomEffect,
  FactionType,
  GainSource,
  GameState,
  PendingReward,
  RewardType,
} from '../../types/GameTypes'
import { BOARD_SPACES } from '../boardSpaces'
import { updateFactionInfluence } from '../../utils/influenceVictoryPoints'

/** Board-space influence bump that Power Play can double (still pending). */
export function findPowerPlayInfluenceTarget(rewards: PendingReward[]): PendingReward | undefined {
  return rewards.find(
    r => !r.disabled && r.source.type === GainSource.BOARD_SPACE && Boolean(r.reward.influence)
  )
}

/** Mark the board influence reward for +1 and drop resolved Power Play custom rewards. */
export function resolvePowerPlayOnPendingRewards(rewards: PendingReward[]): PendingReward[] {
  const target = findPowerPlayInfluenceTarget(rewards)
  if (!target) return rewards

  return rewards
    .map(r => (r.id === target.id ? { ...r, powerPlay: true } : r))
    .filter(r => !(r.reward.custom === CustomEffect.POWER_PLAY && !r.disabled))
}

/**
 * Board influence was already claimed at +1 (e.g. auto-apply). Claiming Power Play grants +1 more
 * on the same faction from the agent space this turn.
 */
export function applyPowerPlayBonusAfterInfluenceClaimed(
  state: GameState,
  playerId: number
): GameState {
  const spaceId = state.currTurn?.agentSpaceId
  if (spaceId == null) return state

  const space = BOARD_SPACES.find(s => s.id === spaceId)
  const bump = space?.influence
  if (!bump) return state

  const newGains = [...(state.gains ?? [])]
  let newState = updateFactionInfluence(state, bump.faction, playerId, bump.amount, {
    appendGainsTo: newGains,
  })
  newGains.push({
    round: newState.currentRound,
    playerId,
    sourceId: spaceId,
    name: bump.faction,
    amount: bump.amount,
    type: RewardType.INFLUENCE,
    source: GainSource.BOARD_SPACE,
  })

  return {
    ...newState,
    gains: newGains,
    pendingRewards: state.pendingRewards.filter(
      r => !(r.reward.custom === CustomEffect.POWER_PLAY && !r.disabled)
    ),
  }
}
