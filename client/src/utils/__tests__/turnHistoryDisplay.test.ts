import { describe, expect, it } from 'vitest'
import { GamePhase, type GameState } from '../../types/GameTypes'
import {
  countPlayerTurns,
  getHistoryRowBadge,
  getLivePlayerTurnNumber,
  getPlayerTurnNumber,
  isMetaHistoryEntry,
} from '../turnHistoryDisplay'

function row(partial: Partial<GameState>): GameState {
  return partial as GameState
}

describe('turnHistoryDisplay', () => {
  it('treats setup, round-start, and combat as meta entries', () => {
    expect(isMetaHistoryEntry(row({ historyEntryKind: 'setup' }))).toBe(true)
    expect(isMetaHistoryEntry(row({ historyEntryKind: 'round-start' }))).toBe(true)
    expect(isMetaHistoryEntry(row({ historyEntryKind: 'combat' }))).toBe(true)
    expect(isMetaHistoryEntry(row({ phase: GamePhase.PLAYER_TURNS }))).toBe(false)
  })

  it('numbers player turns excluding meta rows', () => {
    const turns: GameState[] = [
      row({ historyEntryKind: 'setup', currentRound: 1 }),
      row({ phase: GamePhase.PLAYER_TURNS, currTurn: { playerId: 0, type: 'action' } }),
      row({ phase: GamePhase.PLAYER_TURNS, currTurn: { playerId: 1, type: 'action' } }),
      row({ historyEntryKind: 'combat', currentRound: 1 }),
      row({ historyEntryKind: 'round-start', currentRound: 2 }),
      row({ phase: GamePhase.PLAYER_TURNS, currTurn: { playerId: 0, type: 'action' } }),
    ]

    expect(getPlayerTurnNumber(turns, 0)).toBeNull()
    expect(getPlayerTurnNumber(turns, 1)).toBe(1)
    expect(getPlayerTurnNumber(turns, 2)).toBe(2)
    expect(getPlayerTurnNumber(turns, 3)).toBeNull()
    expect(getPlayerTurnNumber(turns, 4)).toBeNull()
    expect(getPlayerTurnNumber(turns, 5)).toBe(3)
    expect(countPlayerTurns(turns)).toBe(3)
    expect(getLivePlayerTurnNumber(turns)).toBe(4)
  })

  it('shows setup badge for merged opening round row', () => {
    const turns: GameState[] = [
      row({
        historyEntryKind: 'setup',
        phase: GamePhase.PLAYER_TURNS,
        currentRound: 1,
      }),
    ]
    expect(getHistoryRowBadge(turns[0], 0, turns)).toBe('Setup')
    expect(getLivePlayerTurnNumber(turns)).toBe(1)
  })
})
