import {
  ChoiceType,
  GainSource,
  RewardType,
  type FixedOptionsChoice,
  type GameState,
  type OptionalEffect,
} from '../../../types/GameTypes'
import { TECH_NEGOTIATION_SPACE_ID } from './boardSpaceChoices'
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

export type TechAcquireSourceKind = 'board-space' | 'signet-ring' | 'other'

export type TechAcquireSourceOption = {
  id: string
  kind: TechAcquireSourceKind
  label: string
  discount: number
  icon: string
  paySolariInsteadOfSpice?: boolean
  ready: boolean
  pendingOptionalEffectId?: string
  pendingChoice?: TechAcquireOffer['pendingChoice']
}

export const TECH_ACQUIRE_ICON = '/icon/tech.png'
export const TECH_ACQUIRE_DISCOUNT_ICON = '/icon/tech_discount.png'

const SIGNET_RING_NAME = 'Signet Ring'
const TECH_NEGOTIATION_PROMPT = 'Tech Negotiation'

function iconForDiscount(discount: number): string {
  return discount > 0 ? TECH_ACQUIRE_DISCOUNT_ICON : TECH_ACQUIRE_ICON
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

function sourceOptionFromOffer(
  id: string,
  kind: TechAcquireSourceKind,
  label: string,
  offer: TechAcquireOffer
): TechAcquireSourceOption {
  return {
    id,
    kind,
    label,
    discount: offer.discount,
    icon: iconForDiscount(offer.discount),
    paySolariInsteadOfSpice: offer.paySolariInsteadOfSpice,
    ready: offer.ready,
    pendingOptionalEffectId: offer.pendingOptionalEffectId,
    pendingChoice: offer.pendingChoice,
  }
}

function turnGainsForPlayer(state: GameState, playerId: number) {
  const start = state.currTurn?.gainsStartIndex ?? 0
  return (state.gains ?? []).slice(start).filter(g => g.playerId === playerId)
}

function isSignetRingSource(source: { type: GainSource; name: string }): boolean {
  return source.type === GainSource.CARD && source.name === SIGNET_RING_NAME
}

function findSignetAcquireOptional(state: GameState): OptionalEffect | undefined {
  return state.currTurn?.optionalEffects?.find(
    e => e.reward.acquireTech !== undefined && isSignetRingSource(e.source)
  )
}

function findTechNegotiationChoice(state: GameState): FixedOptionsChoice | undefined {
  const choice = state.currTurn?.pendingChoices?.find(
    c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt === TECH_NEGOTIATION_PROMPT
  )
  return choice as FixedOptionsChoice | undefined
}

function techNegotiationAcquireBranch(choice: FixedOptionsChoice) {
  const optionIndex = choice.options.findIndex(
    o => o.reward.acquireTech !== undefined && !o.disabled
  )
  if (optionIndex < 0) return null
  return { choice, optionIndex, option: choice.options[optionIndex]! }
}

function signetNegotiatorUsedThisTurn(state: GameState, playerId: number): boolean {
  return turnGainsForPlayer(state, playerId).some(
    g =>
      g.source === GainSource.CARD &&
      g.name === SIGNET_RING_NAME &&
      g.type === RewardType.NEGOTIATOR &&
      g.amount > 0
  )
}

function boardNegotiatorUsedThisTurn(state: GameState, playerId: number): boolean {
  return turnGainsForPlayer(state, playerId).some(
    g =>
      g.source === GainSource.BOARD_SPACE &&
      g.sourceId === TECH_NEGOTIATION_SPACE_ID &&
      g.type === RewardType.NEGOTIATOR &&
      g.amount > 0
  )
}

function offerFromTechNegotiationBranch(
  choice: FixedOptionsChoice,
  branch: NonNullable<ReturnType<typeof techNegotiationAcquireBranch>>
): TechAcquireOffer {
  return offerFromAcquireReward(branch.option.reward.acquireTech ?? {}, {
    ready: false,
    pendingChoice: {
      choiceId: choice.id,
      optionIndex: branch.optionIndex,
      source: choice.source,
    },
  })
}

function offerFromSignetAcquireOptional(optional: OptionalEffect): TechAcquireOffer {
  return offerFromAcquireReward(optional.reward.acquireTech ?? {}, {
    ready: false,
    pendingOptionalEffectId: optional.id,
  })
}

function boardSpaceSourceOption(
  choice: FixedOptionsChoice,
  branch: NonNullable<ReturnType<typeof techNegotiationAcquireBranch>>
): TechAcquireSourceOption {
  const offer = offerFromTechNegotiationBranch(choice, branch)
  return sourceOptionFromOffer(
    'board-space',
    'board-space',
    choice.source.name || TECH_NEGOTIATION_PROMPT,
    offer
  )
}

function signetRingSourceOption(optional: OptionalEffect): TechAcquireSourceOption {
  const offer = offerFromSignetAcquireOptional(optional)
  return sourceOptionFromOffer('signet-ring', 'signet-ring', SIGNET_RING_NAME, offer)
}

function resolveSignetAndTechNegotiationSourceOptions(
  state: GameState,
  playerId: number
): TechAcquireSourceOption[] | undefined {
  const signetAcquire = findSignetAcquireOptional(state)
  const techNegChoice = findTechNegotiationChoice(state)
  const techNegAcquire = techNegChoice ? techNegotiationAcquireBranch(techNegChoice) : null

  const hasSignetAcquirePending = !!signetAcquire
  const hasTechNegAcquirePending = !!techNegAcquire

  if (!hasSignetAcquirePending && !hasTechNegAcquirePending) {
    return undefined
  }

  if (hasSignetAcquirePending && hasTechNegAcquirePending) {
    if (signetNegotiatorUsedThisTurn(state, playerId)) {
      return [boardSpaceSourceOption(techNegChoice!, techNegAcquire!)]
    }
    if (boardNegotiatorUsedThisTurn(state, playerId)) {
      return [signetRingSourceOption(signetAcquire!)]
    }
    return [
      boardSpaceSourceOption(techNegChoice!, techNegAcquire!),
      signetRingSourceOption(signetAcquire!),
    ]
  }

  if (hasTechNegAcquirePending) {
    return [boardSpaceSourceOption(techNegChoice!, techNegAcquire!)]
  }

  return [signetRingSourceOption(signetAcquire!)]
}

/** All acquire sources the player may use in the tech shop this turn. */
export function getTechAcquireSourceOptions(
  state: GameState,
  playerId: number
): TechAcquireSourceOption[] {
  if (!isRiseOfIxEnabled(state) || !hasAvailableTechTile(state)) return []

  if (state.pendingAcquireTech?.playerId === playerId) {
    const offer = offerFromAcquireReward(state.pendingAcquireTech, { ready: true })
    const discount = offer.discount
    if (discount > 0) {
      return [
        sourceOptionFromOffer('board-space', 'board-space', TECH_NEGOTIATION_PROMPT, offer),
      ]
    }
    return [sourceOptionFromOffer('ready', 'other', 'Acquire tech', offer)]
  }

  const paired = resolveSignetAndTechNegotiationSourceOptions(state, playerId)
  if (paired !== undefined) {
    return paired
  }

  const options: TechAcquireSourceOption[] = []

  for (const choice of state.currTurn?.pendingChoices ?? []) {
    if (choice.type !== ChoiceType.FIXED_OPTIONS) continue
    const fixed = choice as FixedOptionsChoice
    const optionIndex = fixed.options.findIndex(
      o => o.reward.acquireTech !== undefined && !o.disabled
    )
    if (optionIndex < 0) continue
    const option = fixed.options[optionIndex]
    const offer = offerFromAcquireReward(option.reward.acquireTech ?? {}, {
      ready: false,
      pendingChoice: {
        choiceId: fixed.id,
        optionIndex,
        source: fixed.source,
      },
    })
    const discount = offer.discount
    options.push(
      sourceOptionFromOffer(
        `choice-${fixed.id}`,
        discount > 0 ? 'board-space' : 'other',
        fixed.source.name || fixed.prompt,
        offer
      )
    )
  }

  for (const optional of state.currTurn?.optionalEffects ?? []) {
    if (optional.reward.acquireTech === undefined) continue
    const offer = offerFromAcquireReward(optional.reward.acquireTech, {
      ready: false,
      pendingOptionalEffectId: optional.id,
    })
    const kind: TechAcquireSourceKind = isSignetRingSource(optional.source)
      ? 'signet-ring'
      : 'other'
    options.push(
      sourceOptionFromOffer(
        `optional-${optional.id}`,
        kind,
        optional.source.name,
        offer
      )
    )
  }

  return options
}

export function findTechAcquireSourceOption(
  state: GameState,
  playerId: number,
  sourceId: string
): TechAcquireSourceOption | undefined {
  return getTechAcquireSourceOptions(state, playerId).find(o => o.id === sourceId)
}

/** Whether the active player may acquire tech (pending, optional, or OR acquire branch). */
export function getTechAcquireOffer(
  state: GameState,
  playerId: number
): TechAcquireOffer | null {
  const options = getTechAcquireSourceOptions(state, playerId)
  if (options.length === 0) return null
  if (options.length > 1) return null
  const only = options[0]!
  return {
    discount: only.discount,
    paySolariInsteadOfSpice: only.paySolariInsteadOfSpice,
    ready: only.ready,
    pendingOptionalEffectId: only.pendingOptionalEffectId,
    pendingChoice: only.pendingChoice,
  }
}
