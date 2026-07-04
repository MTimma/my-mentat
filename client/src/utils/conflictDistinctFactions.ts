import { ChoiceOption, FactionType } from '../types/GameTypes'
import type { ConflictRewardChoice } from './influenceBoardChoice'

export function distinctFactionGroupKey(
  conflictId: number,
  placement: string,
  playerId: number
): string {
  return `${conflictId}:${placement}:p${playerId}`
}

export function factionFromConflictChoiceReward(
  reward: ChoiceOption['reward']
): FactionType | undefined {
  return reward.influence?.amounts?.[0]?.faction
}

export function filterConflictInfluenceOptions(
  options: ChoiceOption[],
  excludedFactions: FactionType[]
): ChoiceOption[] {
  if (excludedFactions.length === 0) return options
  const excluded = new Set(excludedFactions)
  return options.filter(opt => {
    const faction = factionFromConflictChoiceReward(opt.reward)
    return faction == null || !excluded.has(faction)
  })
}

function isBlockedDistinctGroupChoice(
  choice: ConflictRewardChoice,
  pending: ConflictRewardChoice[],
  groupKey: 'distinctFactionGroup' | 'distinctChoiceGroup'
): boolean {
  const groupId = choice[groupKey]
  if (!groupId) return false
  const group = pending.filter(c => c[groupKey] === groupId)
  return group[0]?.id !== choice.id
}

/** Only the first pending choice in a distinct-faction group may be resolved. */
export function isBlockedDistinctFactionChoice(
  choice: ConflictRewardChoice,
  pending: ConflictRewardChoice[]
): boolean {
  return isBlockedDistinctGroupChoice(choice, pending, 'distinctFactionGroup')
}

/** Only the first pending choice in a distinct-choice group may be resolved. */
export function isBlockedDistinctChoiceGroup(
  choice: ConflictRewardChoice,
  pending: ConflictRewardChoice[]
): boolean {
  return isBlockedDistinctGroupChoice(choice, pending, 'distinctChoiceGroup')
}

/** Block later sequential picks in linked faction or choice-option groups. */
export function isBlockedSequentialConflictChoice(
  choice: ConflictRewardChoice,
  pending: ConflictRewardChoice[]
): boolean {
  return (
    isBlockedDistinctFactionChoice(choice, pending) ||
    isBlockedDistinctChoiceGroup(choice, pending)
  )
}

export function filterConflictChoiceOptions(
  options: ChoiceOption[],
  excludedIndices: number[]
): ChoiceOption[] {
  if (excludedIndices.length === 0) return options
  const excluded = new Set(excludedIndices)
  return options.filter((_, index) => !excluded.has(index))
}

/** Map a visible option index to its index in fullOptions. */
export function originalChoiceOptionIndex(
  choice: ConflictRewardChoice,
  visibleOptionIndex: number
): number | undefined {
  const full = choice.fullOptions ?? choice.options
  const excluded = new Set(choice.excludedChoiceIndices ?? [])
  let visible = 0
  for (let i = 0; i < full.length; i++) {
    if (excluded.has(i)) continue
    if (visible === visibleOptionIndex) return i
    visible++
  }
  return undefined
}

export function applyDistinctChoiceExclusion(
  pending: ConflictRewardChoice[],
  resolvedChoice: ConflictRewardChoice,
  pickedOriginalIndex: number
): ConflictRewardChoice[] {
  if (!resolvedChoice.distinctChoiceGroup) return pending

  return pending.map(choice => {
    if (choice.distinctChoiceGroup !== resolvedChoice.distinctChoiceGroup) return choice
    const excludedChoiceIndices = [...(choice.excludedChoiceIndices ?? []), pickedOriginalIndex]
    const fullOptions = choice.fullOptions ?? choice.options
    return {
      ...choice,
      excludedChoiceIndices,
      options: filterConflictChoiceOptions(fullOptions, excludedChoiceIndices),
    }
  })
}

export function applyDistinctFactionExclusion(
  pending: ConflictRewardChoice[],
  resolvedChoice: ConflictRewardChoice,
  chosenFaction: FactionType
): ConflictRewardChoice[] {
  if (!resolvedChoice.distinctFactionGroup) return pending

  return pending.map(choice => {
    if (choice.distinctFactionGroup !== resolvedChoice.distinctFactionGroup) return choice
    const excludedFactions = [...(choice.excludedFactions ?? []), chosenFaction]
    return {
      ...choice,
      excludedFactions,
      options: filterConflictInfluenceOptions(choice.options, excludedFactions),
    }
  })
}
