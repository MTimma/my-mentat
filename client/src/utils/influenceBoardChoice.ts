import {
  ChoiceType,
  FactionType,
  FixedOptionsChoice,
  GainSource,
  GameState,
} from '../types/GameTypes'
import { canAffordInfluenceReward } from './influenceChoices'
import { isBlockedDistinctFactionChoice } from './conflictDistinctFactions'

export type InfluenceBoardMode = 'lose' | 'gain'

export type ConflictRewardChoice = NonNullable<GameState['pendingConflictRewardChoices']>[number]

export function conflictChoiceAsFixedOptions(choice: ConflictRewardChoice): FixedOptionsChoice {
  return {
    id: choice.id,
    type: ChoiceType.FIXED_OPTIONS,
    prompt: `${choice.conflictName} (${choice.placement})`,
    source: {
      type: GainSource.CONFLICT,
      id: choice.conflictId,
      name: `${choice.conflictName} - ${choice.placement}`,
    },
    options: choice.options,
  }
}

export function findConflictInfluenceBoardChoice(
  choices: GameState['pendingConflictRewardChoices'] | undefined
): ConflictRewardChoice | null {
  if (!choices?.length) return null
  for (const choice of choices) {
    if (isBlockedDistinctFactionChoice(choice, choices)) continue
    if (isInfluenceBoardChoice(conflictChoiceAsFixedOptions(choice))) {
      return choice
    }
  }
  return null
}

/** Fixed-options influence choices resolved by tapping faction tracks on the image board. */
export function isInfluenceBoardChoice(choice: FixedOptionsChoice): boolean {
  if (choice.type !== ChoiceType.FIXED_OPTIONS || choice.options.length === 0) return false

  const amounts = choice.options.map(opt => opt.reward.influence?.amounts[0]?.amount)
  if (amounts.some(amount => amount === undefined || amount === 0)) return false

  const sign = Math.sign(amounts[0]!)
  if (!amounts.every(amount => Math.sign(amount!) === sign)) return false

  return choice.options.every(
    opt =>
      opt.reward.influence?.amounts.length === 1 &&
      !opt.reward.influence?.chooseOne &&
      !opt.reward.custom
  )
}

export function getInfluenceBoardMode(choice: FixedOptionsChoice): InfluenceBoardMode | null {
  if (!isInfluenceBoardChoice(choice)) return null
  const amount = choice.options[0].reward.influence!.amounts[0].amount
  return amount < 0 ? 'lose' : 'gain'
}

export function getInfluenceBoardAmount(choice: FixedOptionsChoice): number {
  return Math.abs(choice.options[0].reward.influence!.amounts[0].amount)
}

export interface InfluenceBoardChoiceMeta {
  mode: InfluenceBoardMode
  amount: number
  selectableFactions: FactionType[]
  disabledFactions: FactionType[]
  optionIndexByFaction: Partial<Record<FactionType, number>>
}

export function getInfluenceBoardChoiceMeta(
  choice: FixedOptionsChoice,
  state: GameState,
  playerId: number
): InfluenceBoardChoiceMeta | null {
  const mode = getInfluenceBoardMode(choice)
  if (!mode) return null

  const amount = getInfluenceBoardAmount(choice)
  const selectableFactions: FactionType[] = []
  const disabledFactions: FactionType[] = []
  const optionIndexByFaction: Partial<Record<FactionType, number>> = {}

  choice.options.forEach((opt, index) => {
    const faction = opt.reward.influence!.amounts[0].faction
    optionIndexByFaction[faction] = index
    const affordable = canAffordInfluenceReward(state, playerId, opt.reward) && !opt.disabled
    if (affordable) {
      selectableFactions.push(faction)
    } else {
      disabledFactions.push(faction)
    }
  })

  return { mode, amount, selectableFactions, disabledFactions, optionIndexByFaction }
}

export function getInfluenceBoardPrompt(mode: InfluenceBoardMode, amount: number): string {
  if (mode === 'lose') {
    return amount === 1 ? 'Choose where to lose influence' : `Choose where to lose ${amount} influence`
  }
  return amount === 1 ? 'Choose where to gain influence' : `Choose where to gain ${amount} influence`
}
