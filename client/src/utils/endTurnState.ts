import {
  GamePhase,
  TurnType,
  type GameState,
  type GameTurn,
  type PendingChoice,
  type PendingReward,
} from '../types/GameTypes'

export interface EndTurnButtonStateInput {
  isHistoryView: boolean
  canEndTurn: boolean
  pendingRewards: PendingReward[]
  opponentDiscardState?: GameTurn['opponentDiscardState']
  pendingChoices: PendingChoice[]
  voiceSelectionActive: boolean
  masterstrokeSelectionActive: boolean
  memnonHighCouncilSelectionActive: boolean
  influenceBoardSelectionActive?: boolean
  /** Card selected for an agent turn but agent not placed yet. */
  agentPlacementPending?: boolean
}

/**
 * During Player Turns, End Turn requires either an Agent placement or a Reveal turn.
 * Tech / intrigue / unload side effects alone must not unlock ending the turn.
 */
export function hasCompletedRequiredTurnAction(
  state: Pick<GameState, 'phase' | 'currTurn'>
): boolean {
  if (state.phase !== GamePhase.PLAYER_TURNS) return true
  const turn = state.currTurn
  if (!turn) return false
  if (turn.type === TurnType.REVEAL) return true
  return turn.agentSpaceId != null
}

/** True when mandatory pending work is clear and the turn action (agent/reveal) is done. */
export function computeCanEndTurn(
  state: Pick<GameState, 'phase' | 'currTurn' | 'pendingRewards'> & {
    pendingResearchAdvance?: GameState['pendingResearchAdvance']
  }
): boolean {
  if (state.pendingRewards.some(r => !r.disabled)) return false
  if ((state.currTurn?.pendingChoices?.length ?? 0) > 0) return false
  if (state.currTurn?.opponentDiscardState) return false
  if (state.pendingResearchAdvance) return false
  if (!hasCompletedRequiredTurnAction(state)) return false
  return true
}

export function getEndTurnButtonState({
  isHistoryView,
  canEndTurn,
  pendingRewards,
  opponentDiscardState,
  pendingChoices,
  voiceSelectionActive,
  masterstrokeSelectionActive,
  memnonHighCouncilSelectionActive,
  influenceBoardSelectionActive = false,
  agentPlacementPending = false,
}: EndTurnButtonStateInput): { disabled: boolean; title?: string } {
  const hasOpponentDiscard = Boolean(opponentDiscardState)
  const hasUnresolvedPendingRewards = pendingRewards.some(r => !r.disabled)
  const hasPendingChoicesToResolve = pendingChoices.length > 0
  const selectionBlocksEndTurn =
    voiceSelectionActive ||
    masterstrokeSelectionActive ||
    memnonHighCouncilSelectionActive ||
    influenceBoardSelectionActive
  const disabled =
    isHistoryView ||
    !canEndTurn ||
    agentPlacementPending ||
    hasUnresolvedPendingRewards ||
    hasOpponentDiscard ||
    hasPendingChoicesToResolve ||
    selectionBlocksEndTurn

  let title: string | undefined
  if (disabled && canEndTurn && !agentPlacementPending) {
    if (hasUnresolvedPendingRewards) {
      title = 'Claim or resolve all pending rewards before ending your turn.'
    } else if (hasOpponentDiscard) {
      title = 'Resolve opponent discard instructions before ending your turn.'
    } else if (hasPendingChoicesToResolve) {
      title = 'Resolve pending choices before ending your turn.'
    } else if (selectionBlocksEndTurn) {
      title = 'Finish the current selection before ending your turn.'
    }
  } else if (disabled && agentPlacementPending) {
    title = 'Place your Agent on a board space before ending your turn.'
  }

  return { disabled, title }
}
