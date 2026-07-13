import type { CardEffect } from '../types/GameTypes'

/** Pooled rewards that can appear as separate OR options on one choiceOpt effect. */
const CHOICE_OPT_SPLITTABLE_KEYS = [
  'persuasion',
  'combat',
  'spice',
  'water',
  'solari',
] as const

type SplittableKey = (typeof CHOICE_OPT_SPLITTABLE_KEYS)[number]

function splittableRewardKeys(reward: CardEffect['reward']): SplittableKey[] {
  return CHOICE_OPT_SPLITTABLE_KEYS.filter(key => reward[key] !== undefined)
}

/**
 * Split a single choiceOpt effect with multiple pooled rewards into one effect per reward.
 * Bene Gesserit Sister reveal is the canonical case: persuasion OR combat.
 */
export function normalizeChoiceOptEffects<T extends CardEffect>(effects: T[] | undefined): T[] {
  if (!effects?.length) return []
  const normalized: T[] = []
  for (const effect of effects) {
    if (!effect.choiceOpt) {
      normalized.push(effect)
      continue
    }
    const keys = splittableRewardKeys(effect.reward)
    if (keys.length <= 1) {
      normalized.push(effect)
      continue
    }
    for (const key of keys) {
      normalized.push({
        ...effect,
        reward: { [key]: effect.reward[key] },
      } as T)
    }
  }
  return normalized
}
