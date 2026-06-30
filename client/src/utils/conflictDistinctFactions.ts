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

/** Only the first pending choice in a distinct-faction group may be resolved. */
export function isBlockedDistinctFactionChoice(
  choice: ConflictRewardChoice,
  pending: ConflictRewardChoice[]
): boolean {
  if (!choice.distinctFactionGroup) return false
  const group = pending.filter(c => c.distinctFactionGroup === choice.distinctFactionGroup)
  return group[0]?.id !== choice.id
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
