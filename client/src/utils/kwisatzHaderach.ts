import { Card, ChoiceType, CustomEffect, TurnType, type GameState, type PlayEffect } from '../types/GameTypes'

export const GAINED_EFFECT_RECALL_REQUIRED = 'RECALL_REQUIRED'
export const GAINED_EFFECT_KWISATZ_FROM_BOARD = 'KWISATZ_FROM_BOARD'

export function isKwisatzHaderachCard(card: Card | null | undefined): boolean {
  return (
    card?.playEffect?.some(
      (effect: PlayEffect) =>
        effect.beforePlaceAgent?.recallAgent ||
        effect.reward?.custom === CustomEffect.KWISATZ_HADERACH
    ) ?? false
  )
}

export function isKwisatzAgentSourceChoice(choiceId: string): boolean {
  return choiceId.includes('KWISATZ-AGENT-SOURCE')
}

export function isKwisatzSourceChoicePending(
  state: Pick<GameState, 'currTurn'>
): boolean {
  return (
    state.currTurn?.pendingChoices?.some(
      choice =>
        choice.type === ChoiceType.FIXED_OPTIONS && isKwisatzAgentSourceChoice(choice.id)
    ) ?? false
  )
}

/** True while an agent-turn card is selected but the agent has not been placed yet. */
export function isAgentPlacementPending(
  state: Pick<GameState, 'selectedCard' | 'currTurn'>
): boolean {
  if (!state.selectedCard) return false
  if (state.currTurn?.type !== TurnType.ACTION) return false
  if (state.currTurn?.agentSpaceId != null) return false
  if (state.currTurn?.agentSpace) return false
  return true
}

export function canPlaceAgentOnBoard(
  state: Pick<GameState, 'selectedCard' | 'currTurn' | 'pendingGraftPartner'>
): boolean {
  if (!isAgentPlacementPending(state)) return false
  if (isKwisatzSourceChoicePending(state)) return false
  if (state.pendingGraftPartner) return false
  return true
}

export function isKwisatzRecallMode(
  state: Pick<GameState, 'currTurn'>
): boolean {
  return state.currTurn?.gainedEffects?.includes(GAINED_EFFECT_RECALL_REQUIRED) ?? false
}
