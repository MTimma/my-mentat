import {
  ChoiceType,
  type FixedOptionsChoice,
  type OptionalEffect,
  type PendingChoice,
  type Reward,
} from '../../../types/GameTypes'

function hasMeaningfulRewardBesidesAcquireTech(reward: Reward): boolean {
  if (reward.spice || reward.water || reward.solari) return true
  if (reward.troops || reward.deployTroops || reward.techNegotiator) return true
  if (reward.drawCards || reward.intrigueCards || reward.persuasion || reward.combat) return true
  if (reward.victoryPoints || reward.trash || reward.trashThisCard) return true
  if (reward.acquire || reward.mentat || reward.custom) return true
  if (reward.influence?.amounts?.length) return true
  return false
}

/** Optional effect whose only reward is Acquire Tech — handled via tech tile clicks instead. */
export function isAcquireTechOnlyOptional(effect: OptionalEffect): boolean {
  return effect.reward.acquireTech !== undefined && !hasMeaningfulRewardBesidesAcquireTech(effect.reward)
}

export function isAcquireTechOnlyChoiceOption(option: { reward: Reward }): boolean {
  return option.reward.acquireTech !== undefined && !hasMeaningfulRewardBesidesAcquireTech(option.reward)
}

export function filterAcquireTechOptionalEffects(effects: OptionalEffect[]): OptionalEffect[] {
  return effects.filter(effect => !isAcquireTechOnlyOptional(effect))
}

export function filterAcquireTechFromChoices(choices: PendingChoice[]): PendingChoice[] {
  return choices.flatMap(choice => {
    if (choice.type !== ChoiceType.FIXED_OPTIONS) return [choice]
    const fixed = choice as FixedOptionsChoice
    const options = fixed.options.filter(option => !isAcquireTechOnlyChoiceOption(option))
    if (options.length === 0) return []
    if (options.length === fixed.options.length) return [choice]
    return [{ ...fixed, options }]
  })
}

/** Map a filtered choice option back to its index in the live pending choice. */
export function findOriginalOptionIndex(
  originalOptions: FixedOptionsChoice['options'],
  selected: FixedOptionsChoice['options'][number]
): number {
  const idx = originalOptions.findIndex(o => choiceOptionsMatch(o, selected))
  return idx >= 0 ? idx : originalOptions.indexOf(selected)
}

function choiceOptionsMatch(
  a: FixedOptionsChoice['options'][number],
  b: FixedOptionsChoice['options'][number]
): boolean {
  if (a.disabled !== b.disabled) return false
  const ar = a.reward
  const br = b.reward
  if (ar.techNegotiator !== br.techNegotiator) return false
  if (Boolean(ar.acquireTech) !== Boolean(br.acquireTech)) return false
  if ((ar.acquireTech?.discount ?? 0) !== (br.acquireTech?.discount ?? 0)) return false
  if (ar.custom !== br.custom) return false
  return JSON.stringify(ar) === JSON.stringify(br)
}
