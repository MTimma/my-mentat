import { BOARD_SPACES } from '../data/boardSpaces'
import { GamePhase, GameState, TurnType } from '../types/GameTypes'

/** Non-player rows: setup, round start, combat resolution. */
export function isMetaHistoryEntry(turn: GameState | undefined): boolean {
  if (!turn) return false
  const kind = turn.historyEntryKind
  return kind === 'setup' || kind === 'round-start' || kind === 'combat' || kind === 'endgame'
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
export function getLivePlayerTurnNumber(turns: GameState[], offset = 0): number {
  return countPlayerTurns(turns) + 1 + Math.max(0, offset)
}

/** Round label for play chrome; null when the position is imaginary (no round shown). */
export function getDisplayRound(state: GameState): number | null {
  if (state.hideRoundLabel) return null
  return state.currentRound
}

export function formatTurnRoundHeader(turnNum: number, round: number | null): string {
  return round != null ? `Turn ${turnNum}, round ${round}` : `Turn ${turnNum}`
}

/** Human-readable label for a history row or the live in-progress turn. */
export function getHistoryRowLabel(turns: GameState[], index: number): string {
  if (index >= turns.length) {
    return `Turn ${getLivePlayerTurnNumber(turns)}`
  }
  const turn = turns[index]
  if (!turn) return `Turn ${index}`
  if (
    turn.historyEntryKind === 'setup' &&
    turn.phase === GamePhase.PLAYER_TURNS &&
    !turn.sandboxSetup
  ) {
    return `Round ${turn.currentRound} start`
  }
  if (index === 0 || turn.historyEntryKind === 'setup') return 'Setup'
  if (turn.historyEntryKind === 'round-start') return `Round ${turn.currentRound} start`
  if (turn.historyEntryKind === 'combat') return 'Combat'
  if (turn.historyEntryKind === 'endgame') return 'Endgame'
  const playerTurnNum = getPlayerTurnNumber(turns, index)
  return playerTurnNum != null ? `Turn ${playerTurnNum}` : `Turn ${index}`
}

/** Board space name, "Reveal", "Agent", etc. for a player turn row. */
export function getTurnActionLabel(turn: GameState): string {
  if (turn.phase === GamePhase.COMBAT) return 'Combat'
  const curr = turn.currTurn
  if (!curr) return '—'
  if (curr.type === TurnType.ACTION) {
    const spaceId = curr.agentSpaceId
    if (spaceId != null) {
      const space = BOARD_SPACES.find(s => s.id === spaceId)
      if (space) return space.name
    }
    return 'Agent'
  }
  if (curr.type === TurnType.REVEAL) return 'Reveal'
  if (curr.type === TurnType.PASS) return 'Pass'
  return curr.type
}

export function getHistoryRowBadge(turn: GameState, index: number, turns: GameState[]): string {
  if (turn.historyEntryKind === 'endgame') return 'Endgame'
  if (turn.historyEntryKind === 'combat') return 'Combat'
  if (turn.historyEntryKind === 'round-start') return 'Round'
  if (
    turn.historyEntryKind === 'setup' &&
    turn.phase === GamePhase.PLAYER_TURNS &&
    !turn.sandboxSetup
  ) {
    return 'Round'
  }
  if (index === 0 || turn.historyEntryKind === 'setup') return 'Setup'
  const playerTurnNum = getPlayerTurnNumber(turns, index)
  return playerTurnNum != null ? String(playerTurnNum) : String(index)
}
