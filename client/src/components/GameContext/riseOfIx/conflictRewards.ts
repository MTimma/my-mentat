import {
  ChoiceType,
  ConflictReward,
  FixedOptionsChoice,
  GainSource,
  GameState,
  PendingChoice,
  PendingReward,
  RewardType,
} from '../../../types/GameTypes'
import { nextSemanticId } from '../../../utils/semanticIds'
import {
  GainAttribution,
  hasAvailableTechTile,
  isRiseOfIxEnabled,
  pushFreighterChoicesFromReward,
} from './freighter'

export const RISE_OF_IX_CONFLICT_ID_MIN = 919
export const RISE_OF_IX_CONFLICT_ID_MAX = 922

export function isRiseOfIxConflict(conflictId: number): boolean {
  return conflictId >= RISE_OF_IX_CONFLICT_ID_MIN && conflictId <= RISE_OF_IX_CONFLICT_ID_MAX
}

export function conflictRewardSource(
  conflictId: number,
  conflictName: string,
  placement: string
): GainAttribution {
  return { type: GainSource.CONFLICT, id: conflictId, name: `${conflictName} - ${placement}` }
}

/** Push Advance/Recall choices into pending conflict reward choices (combat phase). */
export function appendConflictFreighterChoices(
  state: GameState,
  count: number,
  playerId: number,
  source: GainAttribution,
  conflictId: number,
  conflictName: string,
  placement: string,
  pendingConflictChoices: NonNullable<GameState['pendingConflictRewardChoices']>
): void {
  if (!isRiseOfIxEnabled(state) || !isRiseOfIxConflict(conflictId) || count <= 0) return

  const freighterPending: PendingChoice[] = []
  pushFreighterChoicesFromReward(state, count, playerId, source, freighterPending)

  for (const choice of freighterPending) {
    if (choice.type !== ChoiceType.FIXED_OPTIONS) continue
    const fixed = choice as FixedOptionsChoice
    pendingConflictChoices.push({
      id: fixed.id,
      playerId,
      placement,
      conflictId,
      conflictName,
      options: fixed.options,
    })
  }
}

export function enqueueConflictAcquireTech(
  state: GameState,
  playerId: number,
  source: GainAttribution,
  pendingRewards: PendingReward[],
  discount: 0 | 1 | 2 = 0
): GameState {
  const gains = [...state.gains]
  if (!hasAvailableTechTile(state)) {
    gains.push({
      round: state.currentRound,
      playerId,
      source: GainSource.CONFLICT,
      sourceId: source.id,
      name: `${source.name} (no tech available)`,
      amount: 0,
      type: RewardType.TECH,
    })
    return { ...state, gains }
  }

  const rewardId = nextSemanticId(source, 'REWARD', pendingRewards.map(r => r.id))
  pendingRewards.push({
    id: rewardId,
    source,
    reward: { acquireTech: { discount } },
    isTrash: false,
  })
  gains.push({
    round: state.currentRound,
    playerId,
    source: GainSource.CONFLICT,
    sourceId: source.id,
    name: source.name,
    amount: 1,
    type: RewardType.TECH,
  })
  return { ...state, gains }
}

/** Apply placement rewards: immediate resources first, then deferred freighter choices. */
export function applyRiseOfIxConflictPlacementRewards(
  state: GameState,
  rewards: ConflictReward[],
  placement: string,
  playerIds: number[],
  conflictId: number,
  conflictName: string,
  applyImmediate: (
    current: GameState,
    reward: ConflictReward,
    placement: string,
    playerIds: number[]
  ) => GameState,
  deferChoice: (reward: ConflictReward, placement: string, playerIds: number[]) => void,
  pendingConflictChoices: NonNullable<GameState['pendingConflictRewardChoices']>,
  pendingRewards: PendingReward[]
): GameState {
  if (!isRiseOfIxEnabled(state) || !isRiseOfIxConflict(conflictId)) {
    let next = state
    for (const reward of rewards) {
      if (reward.type === RewardType.FREIGHTER || reward.type === RewardType.TECH) continue
      const hasChoice =
        (reward.choiceOptions && reward.choiceOptions.length > 0) ||
        (reward.chooseFaction && reward.type === RewardType.INFLUENCE)
      if (hasChoice) {
        deferChoice(reward, placement, playerIds)
        continue
      }
      next = applyImmediate(next, reward, placement, playerIds)
    }
    return next
  }

  let next = state
  const deferredFreighter: ConflictReward[] = []
  const winnerId = playerIds[0]

  for (const reward of rewards) {
    const hasChoice =
      (reward.choiceOptions && reward.choiceOptions.length > 0) ||
      (reward.chooseFaction && reward.type === RewardType.INFLUENCE)
    if (hasChoice) {
      deferChoice(reward, placement, playerIds)
      continue
    }
    if (reward.type === RewardType.FREIGHTER) {
      deferredFreighter.push(reward)
      continue
    }
    if (reward.type === RewardType.TECH) {
      const source = conflictRewardSource(conflictId, conflictName, placement)
      next = enqueueConflictAcquireTech(next, winnerId, source, pendingRewards)
      continue
    }
    next = applyImmediate(next, reward, placement, playerIds)
  }

  if (deferredFreighter.length > 0 && winnerId != null) {
    const source = conflictRewardSource(conflictId, conflictName, placement)
    const totalFreighter = deferredFreighter.reduce((sum, r) => sum + r.amount, 0)
    appendConflictFreighterChoices(
      next,
      totalFreighter,
      winnerId,
      source,
      conflictId,
      conflictName,
      placement,
      pendingConflictChoices
    )
  }

  return next
}
