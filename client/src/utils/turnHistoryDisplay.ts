import { GameState } from '../types/GameTypes'

/** Non-player rows: setup, round start, combat resolution. */
export function isMetaHistoryEntry(turn: GameState | undefined): boolean {
  if (!turn) return false
  const kind = turn.historyEntryKind
  return kind === 'setup' || kind === 'round-start' || kind === 'combat'
}

export function isPlayerTurnHistoryEntry(turn: GameState | undefined): boolean {
  return turn != null && !isMetaHistoryEntry(turn)
}

/** 1-based player turn number at `index`, or null for meta rows. */
export function getPlayerTurnNumber(turns: GameState[], index: number): number | null {
  const turn = turns[index]
  if (!turn || isMetaHistoryEntry(turn)) return null
  let num = 0
  for (let i = 0; i <= index; i++) {
    if (isPlayerTurnHistoryEntry(turns[i])) num++
  }
  return num
}

export function countPlayerTurns(turns: GameState[]): number {
  return turns.filter(isPlayerTurnHistoryEntry).length
}

/** 1-based number for the in-progress turn row (after all completed player turns). */
export function getLivePlayerTurnNumber(turns: GameState[]): number {
  return countPlayerTurns(turns) + 1
}

export function getHistoryRowBadge(turn: GameState, index: number, turns: GameState[]): string {
  if (turn.historyEntryKind === 'combat') return 'Combat'
  if (turn.historyEntryKind === 'round-start') return 'Round'
  if (index === 0 || turn.historyEntryKind === 'setup') return 'Setup'
  const playerTurnNum = getPlayerTurnNumber(turns, index)
  return playerTurnNum != null ? String(playerTurnNum) : String(index)
}
