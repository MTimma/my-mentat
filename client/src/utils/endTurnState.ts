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
}: EndTurnButtonStateInput): { disabled: boolean; title?: string } {
  const hasOpponentDiscard = Boolean(opponentDiscardState)
  const hasUnresolvedPendingRewards = pendingRewards.some(r => !r.disabled)
  const hasPendingChoicesToResolve = pendingChoices.length > 0
  const selectionBlocksEndTurn =
    voiceSelectionActive || masterstrokeSelectionActive || memnonHighCouncilSelectionActive
  const disabled =
    isHistoryView ||
    !canEndTurn ||
    hasUnresolvedPendingRewards ||
    hasOpponentDiscard ||
    hasPendingChoicesToResolve ||
    selectionBlocksEndTurn

  let title: string | undefined
  if (disabled && canEndTurn) {
    if (hasUnresolvedPendingRewards) {
      title = 'Claim or resolve all pending rewards before ending your turn.'
    } else if (hasOpponentDiscard) {
      title = 'Resolve opponent discard instructions before ending your turn.'
    } else if (hasPendingChoicesToResolve) {
      title = 'Resolve pending choices before ending your turn.'
    } else if (selectionBlocksEndTurn) {
      title = 'Finish the current selection before ending your turn.'
    }
  }

  return { disabled, title }
}
