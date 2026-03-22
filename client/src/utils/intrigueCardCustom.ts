import { CustomEffect, IntrigueCard } from '../types/GameTypes'

/** True if any play line on this intrigue card uses the given custom effect. */
export function intrigueCardHasCustom(card: IntrigueCard, effect: CustomEffect): boolean {
  return card.playEffect?.some(e => e.reward?.custom === effect) ?? false
}
