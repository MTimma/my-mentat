import {
  ChoiceType,
  type FixedOptionsChoice,
  type GameState,
} from '../../../types/GameTypes'
import { hasAvailableTechTile, isRiseOfIxEnabled } from './freighter'

export type TechAcquireOffer = {
  discount: number
  paySolariInsteadOfSpice?: boolean
  /** Acquire Tech reward already claimed — go straight to ACQUIRE_TECH. */
  ready: boolean
  /** Optional may-effect not yet paid (Dreadnought, cards, etc.). */
  pendingOptionalEffectId?: string
  /** OR choice not yet resolved (e.g. Tech Negotiation acquire branch). */
  pendingChoice?: { choiceId: string; optionIndex: number; source: FixedOptionsChoice['source'] }
}

function offerFromAcquireReward(
  reward: { discount?: number; paySolariInsteadOfSpice?: boolean },
  extras: Omit<TechAcquireOffer, 'discount' | 'paySolariInsteadOfSpice' | 'ready'> & { ready: boolean }
): TechAcquireOffer {
  return {
    discount: reward.discount ?? 0,
    paySolariInsteadOfSpice: reward.paySolariInsteadOfSpice,
    ...extras,
  }
}

/** Whether the active player may acquire tech (pending, optional, or OR acquire branch). */
export function getTechAcquireOffer(
  state: GameState,
  playerId: number
): TechAcquireOffer | null {
  if (!isRiseOfIxEnabled(state) || !hasAvailableTechTile(state)) return null

  if (state.pendingAcquireTech?.playerId === playerId) {
    return offerFromAcquireReward(state.pendingAcquireTech, { ready: true })
  }

  const optional = state.currTurn?.optionalEffects?.find(e => e.reward.acquireTech !== undefined)
  if (optional?.reward.acquireTech !== undefined) {
    return offerFromAcquireReward(optional.reward.acquireTech, {
      ready: false,
      pendingOptionalEffectId: optional.id,
    })
  }

  for (const choice of state.currTurn?.pendingChoices ?? []) {
    if (choice.type !== ChoiceType.FIXED_OPTIONS) continue
    const fixed = choice as FixedOptionsChoice
    const optionIndex = fixed.options.findIndex(
      o => o.reward.acquireTech !== undefined && !o.disabled
    )
    if (optionIndex < 0) continue
    const option = fixed.options[optionIndex]
    return offerFromAcquireReward(option.reward.acquireTech ?? {}, {
      ready: false,
      pendingChoice: {
        choiceId: fixed.id,
        optionIndex,
        source: fixed.source,
      },
    })
  }

  return null
}
