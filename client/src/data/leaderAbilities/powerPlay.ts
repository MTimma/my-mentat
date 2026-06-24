import {
  CustomEffect,
  FactionType,
  GainSource,
  GameState,
  PendingChoice,
  PendingReward,
  RewardType,
} from '../../types/GameTypes'
import { collectLiveIds } from '../../utils/semanticIds'
import { BOARD_SPACES } from '../boardSpaces'
import { updateFactionInfluence } from '../../utils/influenceVictoryPoints'
import { tryTessiaSnooperClaim } from './tessiaSnoopers'

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
): { state: GameState; pendingChoices: PendingChoice[] } {
  const spaceId = state.currTurn?.agentSpaceId
  if (spaceId == null) return { state, pendingChoices: [] }

  const space = BOARD_SPACES.find(s => s.id === spaceId)
  const bump = space?.influence
  if (!bump) return { state, pendingChoices: [] }

  const player = state.players.find(p => p.id === playerId)
  if (!player) return { state, pendingChoices: [] }

  const previous = state.factionInfluence[bump.faction]?.[playerId] ?? 0
  const newGains = [...(state.gains ?? [])]
  let newState = updateFactionInfluence(state, bump.faction, playerId, bump.amount, {
    appendGainsTo: newGains,
  })
  const updated = newState.factionInfluence[bump.faction]?.[playerId] ?? 0
  newGains.push({
    round: newState.currentRound,
    playerId,
    sourceId: spaceId,
    name: bump.faction,
    amount: bump.amount,
    type: RewardType.INFLUENCE,
    source: GainSource.BOARD_SPACE,
  })

  let pendingChoices: PendingChoice[] = []
  const claim = tryTessiaSnooperClaim(
    newState,
    player,
    bump.faction,
    previous,
    updated,
    collectLiveIds(newState),
    newGains
  )
  if (claim) {
    newState = claim.state
    pendingChoices = claim.pendingChoices
    newState = {
      ...newState,
      players: newState.players.map(p => (p.id === playerId ? claim.player : p)),
    }
  }

  return {
    state: {
      ...newState,
      gains: newGains,
      pendingRewards: state.pendingRewards.filter(
        r => !(r.reward.custom === CustomEffect.POWER_PLAY && !r.disabled)
      ),
    },
    pendingChoices,
  }
}
