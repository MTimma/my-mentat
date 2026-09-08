import type { GameState } from '../types/GameTypes'
import { GamePhase } from '../types/GameTypes'
import { isEndgameHistoryEntry } from './turnGainsDisplay'

export function hasEndgameReveals(turn: GameState): boolean {
  const revealed = turn.endgameRevealedIntrigue
  if (!revealed) return false
  return Object.values(revealed).some(cards => cards.length > 0)
}

export function hasEndgameRowContent(turn: GameState): boolean {
  if (!isEndgameHistoryEntry(turn)) return false
  return (
    (turn.endgameWinners?.length ?? 0) > 0 ||
    hasEndgameReveals(turn) ||
    (turn.gains?.length ?? 0) > 0
  )
}

/** Prefer live endgame fields when the history snapshot was written before resolution finished. */
export function mergeEndgameHistoryRow(
  turn: GameState,
  currentGameState: GameState,
  isLastHistoryRow: boolean
): GameState {
  if (!isEndgameHistoryEntry(turn) || !isLastHistoryRow) return turn

  const winners = turn.endgameWinners?.length
    ? turn.endgameWinners
    : currentGameState.endgameWinners ?? undefined
  const revealed =
    turn.endgameRevealedIntrigue && hasEndgameReveals(turn)
      ? turn.endgameRevealedIntrigue
      : currentGameState.endgameRevealedIntrigue ?? turn.endgameRevealedIntrigue

  if (winners === turn.endgameWinners && revealed === turn.endgameRevealedIntrigue) {
    return turn
  }

  return {
    ...turn,
    endgameWinners: winners ?? turn.endgameWinners,
    endgameRevealedIntrigue: revealed,
  }
}

export function isEndgameResolved(currentGameState: GameState): boolean {
  return (currentGameState.endgameWinners?.length ?? 0) > 0
}

/** View-only in-progress games hide the live turn. Finished games show every turn. */
export function shouldHideLiveTurnForViewers(
  canEdit: boolean,
  currentGameState: GameState
): boolean {
  if (canEdit) return false
  return !isEndgameResolved(currentGameState)
}

export function clampHistoryViewIndex(
  turnIndex: number | null,
  historyLength: number,
  hideLiveTurn: boolean
): number | null {
  if (!hideLiveTurn) {
    if (turnIndex == null) return null
    if (turnIndex < 0) return 0
    if (turnIndex >= historyLength) return null
    return turnIndex
  }
  if (historyLength <= 0) return null
  const last = historyLength - 1
  if (turnIndex == null || turnIndex >= historyLength) return last
  if (turnIndex < 0) return 0
  return turnIndex
}

export function shouldHideLiveHistoryEntry(
  turns: GameState[],
  currentGameState: GameState
): boolean {
  if (!isEndgameResolved(currentGameState)) return false
  const last = turns[turns.length - 1]
  if (!last || !isEndgameHistoryEntry(last)) return false
  const merged = mergeEndgameHistoryRow(last, currentGameState, true)
  return hasEndgameRowContent(merged)
}

export function isLiveEndgameEntry(currentGameState: GameState): boolean {
  return currentGameState.phase === GamePhase.END_GAME
}
