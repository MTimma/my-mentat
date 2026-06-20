import { CustomEffect, GamePhase, IntrigueCard } from '../types/GameTypes'

/** True if any play line on this intrigue card uses the given custom effect. */
export function intrigueCardHasCustom(card: IntrigueCard, effect: CustomEffect): boolean {
  return card.playEffect?.some(e => e.reward?.custom === effect) ?? false
}

export function intrigueHasPhaseEffect(card: IntrigueCard, phase: GamePhase): boolean {
  return Boolean(
    card.playEffect?.some(e => {
      if (!e.phase) return false
      const phases = Array.isArray(e.phase) ? e.phase : [e.phase]
      return phases.includes(phase)
    })
  )
}
