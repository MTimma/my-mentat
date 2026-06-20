import { describe, expect, it } from 'vitest'
import { GamePhase, TurnType, type GameState } from '../../types/GameTypes'
import {
  countPlayerTurns,
  formatTurnRoundHeader,
  getDisplayRound,
  getHistoryRowBadge,
  getHistoryRowLabel,
  getLivePlayerTurnNumber,
  getPlayerTurnNumber,
  getTurnActionLabel,
  isMetaHistoryEntry,
} from '../turnHistoryDisplay'
import { BOARD_SPACES } from '../../data/boardSpaces'

function row(partial: Partial<GameState>): GameState {
  return partial as GameState
}

describe('turnHistoryDisplay', () => {
  it('treats setup, round-start, combat, and endgame as meta entries', () => {
    expect(isMetaHistoryEntry(row({ historyEntryKind: 'setup' }))).toBe(true)
    expect(isMetaHistoryEntry(row({ historyEntryKind: 'round-start' }))).toBe(true)
    expect(isMetaHistoryEntry(row({ historyEntryKind: 'combat' }))).toBe(true)
    expect(isMetaHistoryEntry(row({ historyEntryKind: 'endgame' }))).toBe(true)
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

  it('applies player turn offset for sandbox mid-round starts', () => {
    const turns: GameState[] = [
      row({ historyEntryKind: 'setup', currentRound: 1 }),
      row({ phase: GamePhase.PLAYER_TURNS, currTurn: { playerId: 0, type: 'action' } }),
    ]
    expect(getLivePlayerTurnNumber(turns, 4)).toBe(6)
  })

  it('hides round label for imaginary sandbox positions', () => {
    expect(getDisplayRound(row({ currentRound: 3, hideRoundLabel: true }))).toBeNull()
    expect(getDisplayRound(row({ currentRound: 3 }))).toBe(3)
    expect(formatTurnRoundHeader(5, null)).toBe('Turn 5')
    expect(formatTurnRoundHeader(5, 2)).toBe('Turn 5, round 2')
  })

  it('labels history rows with player turn numbers, not raw indices', () => {
    const turns: GameState[] = [
      row({ historyEntryKind: 'setup', currentRound: 1 }),
      row({ phase: GamePhase.PLAYER_TURNS, currTurn: { playerId: 0, type: 'action' } }),
      row({ phase: GamePhase.PLAYER_TURNS, currTurn: { playerId: 1, type: 'action' } }),
      row({ historyEntryKind: 'combat', currentRound: 1 }),
    ]

    expect(getHistoryRowLabel(turns, 0)).toBe('Setup')
    expect(getHistoryRowLabel(turns, 1)).toBe('Turn 1')
    expect(getHistoryRowLabel(turns, 2)).toBe('Turn 2')
    expect(getHistoryRowLabel(turns, 3)).toBe('Combat')
    expect(getHistoryRowLabel(turns, 4)).toBe('Turn 3')
  })

  it('labels merged opening round-start at index 0 as round start, not setup', () => {
    const turns: GameState[] = [
      row({
        historyEntryKind: 'setup',
        phase: GamePhase.PLAYER_TURNS,
        currentRound: 1,
      }),
    ]
    expect(getHistoryRowLabel(turns, 0)).toBe('Round 1 start')
    expect(getHistoryRowBadge(turns[0], 0, turns)).toBe('Round')
    expect(getLivePlayerTurnNumber(turns)).toBe(1)
  })

  it('getTurnActionLabel returns board space name for agent turns', () => {
    const space = BOARD_SPACES[0]
    expect(
      getTurnActionLabel(
        row({
          phase: GamePhase.PLAYER_TURNS,
          currTurn: { playerId: 0, type: TurnType.ACTION, agentSpaceId: space.id },
        })
      )
    ).toBe(space.name)
  })

  it('getTurnActionLabel returns Reveal for reveal turns', () => {
    expect(
      getTurnActionLabel(
        row({
          phase: GamePhase.PLAYER_TURNS,
          currTurn: { playerId: 0, type: TurnType.REVEAL },
        })
      )
    ).toBe('Reveal')
  })

  it('getTurnActionLabel returns Agent when no board space', () => {
    expect(
      getTurnActionLabel(
        row({
          phase: GamePhase.PLAYER_TURNS,
          currTurn: { playerId: 0, type: TurnType.ACTION },
        })
      )
    ).toBe('Agent')
  })
})
