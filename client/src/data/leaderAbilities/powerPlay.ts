import {
  CustomEffect,
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

/**
 * Board-space influence bump that an "influence doubler" card can double
 * (still pending). Used by Power Play and Treachery — both read
 * "Gain two Influence instead of one."
 */
export function findBoardInfluenceTarget(rewards: PendingReward[]): PendingReward | undefined {
  return rewards.find(
    r => !r.disabled && r.source.type === GainSource.BOARD_SPACE && Boolean(r.reward.influence)
  )
}

/**
 * Mark the board influence reward for +1 and drop the resolved doubler custom
 * reward (`custom`). Returns the rewards unchanged when there is no target.
 */
export function resolveInfluenceDoublerOnPendingRewards(
  rewards: PendingReward[],
  custom: CustomEffect
): PendingReward[] {
  const target = findBoardInfluenceTarget(rewards)
  if (!target) return rewards

  return rewards
    .map(r => (r.id === target.id ? { ...r, powerPlay: true } : r))
    .filter(r => !(r.reward.custom === custom && !r.disabled))
}

/**
 * Board influence was already claimed at +1 (e.g. auto-apply). Claiming the
 * doubler grants +1 more on the same faction from the agent space this turn.
 */
export function applyInfluenceDoublerBonusAfterInfluenceClaimed(
  state: GameState,
  playerId: number,
  custom: CustomEffect
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
        r => !(r.reward.custom === custom && !r.disabled)
      ),
    },
    pendingChoices,
  }
}

/** Power Play — "Gain two Influence instead of one." */
export function resolvePowerPlayOnPendingRewards(rewards: PendingReward[]): PendingReward[] {
  return resolveInfluenceDoublerOnPendingRewards(rewards, CustomEffect.POWER_PLAY)
}

/** Power Play — +1 after the board influence was already claimed. */
export function applyPowerPlayBonusAfterInfluenceClaimed(
  state: GameState,
  playerId: number
): { state: GameState; pendingChoices: PendingChoice[] } {
  return applyInfluenceDoublerBonusAfterInfluenceClaimed(state, playerId, CustomEffect.POWER_PLAY)
}

/** Treachery — "Gain two Influence instead of one. Trash this card." */
export function resolveTreacheryOnPendingRewards(rewards: PendingReward[]): PendingReward[] {
  return resolveInfluenceDoublerOnPendingRewards(rewards, CustomEffect.TREACHERY_DOUBLE_INFLUENCE)
}

/** Treachery — +1 after the board influence was already claimed. */
export function applyTreacheryBonusAfterInfluenceClaimed(
  state: GameState,
  playerId: number
): { state: GameState; pendingChoices: PendingChoice[] } {
  return applyInfluenceDoublerBonusAfterInfluenceClaimed(
    state,
    playerId,
    CustomEffect.TREACHERY_DOUBLE_INFLUENCE
  )
}

/** True when a pending influence-doubler custom reward is still unclaimed. */
export function hasUnclaimedInfluenceDoubler(rewards: PendingReward[]): boolean {
  return rewards.some(
    r =>
      !r.disabled &&
      (r.reward.custom === CustomEffect.POWER_PLAY ||
        r.reward.custom === CustomEffect.TREACHERY_DOUBLE_INFLUENCE)
  )
}
