import {
  ChoiceType,
  type FixedOptionsChoice,
  type GameState,
} from '../../../types/GameTypes'
import { SIGNET_RING_PROMPT } from './boardSpaceChoices'

/** `card-<id>-EFFECT` or `card-<id>-EFFECT-<n>` from pre-OR Rhombur signet optional effects. */
export function parseCardEffectLegacyId(
  effectId: string
): { cardId: number; occurrence: number } | null {
  const match = /^card-(\d+)-EFFECT(?:-(\d+))?$/.exec(effectId)
  if (!match) return null
  return {
    cardId: Number(match[1]),
    occurrence: match[2] ? Number(match[2]) : 0,
  }
}

function findRhomburSignetChoice(state: GameState, cardId: number): FixedOptionsChoice | undefined {
  return state.currTurn?.pendingChoices?.find(
    c =>
      c.type === ChoiceType.FIXED_OPTIONS &&
      c.prompt === SIGNET_RING_PROMPT &&
      (c as FixedOptionsChoice).source.id === cardId
  ) as FixedOptionsChoice | undefined
}

/**
 * Old Rhombur signet used two separate optional effects (EFFECT / EFFECT-1).
 * Order in signetRingEffectsRiseOfIx before the OR refactor:
 *   card-<id>-EFFECT     → acquire tech
 *   card-<id>-EFFECT-1   → tech negotiator
 */
export function legacySignetOptionIndexFromEffectOccurrence(
  occurrence: number,
  choice: FixedOptionsChoice
): number {
  const acquireIndex = choice.options.findIndex(o => o.reward.acquireTech !== undefined)
  const negotiatorIndex = choice.options.findIndex(o => (o.reward.techNegotiator ?? 0) > 0)
  if (occurrence === 0) return acquireIndex
  if (occurrence === 1) return negotiatorIndex
  return -1
}

export function findRhomburSignetLegacyResolveChoice(
  state: GameState,
  playerId: number,
  effectId: string
): { choiceId: string; optionIndex: number; source: FixedOptionsChoice['source'] } | null {
  const parsed = parseCardEffectLegacyId(effectId)
  if (!parsed) return null

  const signetChoice = findRhomburSignetChoice(state, parsed.cardId)
  if (!signetChoice) return null

  const optionIndex = legacySignetOptionIndexFromEffectOccurrence(parsed.occurrence, signetChoice)
  if (optionIndex < 0) return null

  const option = signetChoice.options[optionIndex]
  if (!option || option.disabled) return null

  return {
    choiceId: signetChoice.id,
    optionIndex,
    source: signetChoice.source,
  }
}
