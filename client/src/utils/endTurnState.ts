import type { GameTurn, PendingChoice, PendingReward } from '../types/GameTypes'

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
