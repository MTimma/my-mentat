import type { Cost, GameState, OptionalEffect, Reward } from '../../../types/GameTypes'
import { GainSource } from '../../../types/GameTypes'
import { nextSemanticId } from '../../../utils/semanticIds'
import { hasAvailableTechTile } from './freighter'

export type MayEffectLike = {
  cost?: Cost
  reward: Reward
  /** When set, overrides default optional detection for acquireTech / techNegotiator icons. */
  optional?: boolean
}

/** Per rules: "may" — Acquire Tech and Tech Negotiator icons are optional unless arrow-costed. */
export function isMayOptionalReward(reward: Reward): boolean {
  return reward.acquireTech !== undefined || (reward.techNegotiator ?? 0) > 0
}

export function effectIsOptional(effect: MayEffectLike): boolean {
  if (effect.optional === true) return true
  if (effect.optional === false) return false
  return isMayOptionalReward(effect.reward)
}

export function canUseMayOptionalEffect(
  state: GameState,
  playerId: number,
  effect: MayEffectLike
): boolean {
  const { reward } = effect
  if (reward.acquireTech !== undefined && !hasAvailableTechTile(state)) return false
  if (reward.techNegotiator) {
    const player = state.players.find(p => p.id === playerId)
    if ((player?.troopSupply ?? 0) < reward.techNegotiator) return false
  }
  return true
}

export function buildMayOptionalEffect(
  state: GameState,
  playerId: number,
  source: { type: GainSource; id: number; name: string },
  effect: MayEffectLike,
  existingIds: string[]
): OptionalEffect | null {
  if (!effectIsOptional(effect)) return null
  if (!canUseMayOptionalEffect(state, playerId, effect)) return null
  return {
    id: nextSemanticId(source, 'EFFECT', existingIds),
    cost: effect.cost ?? {},
    reward: effect.reward,
    source,
  }
}
