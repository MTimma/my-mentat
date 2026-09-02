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
  getRoundStartLabel,
  getTurnActionLabel,
  getBirdseyeHistoryCellParts,
  buildBirdseyeTurnHistoryGrid,
  groupBirdseyeHistoryRounds,
  isMetaHistoryEntry,
  isRoundStartHistoryEntry,
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
    expect(getHistoryRowBadge(turns[0], 0, turns)).toBe('')
    expect(getLivePlayerTurnNumber(turns)).toBe(1)
  })

  it('identifies round-start rows and labels them without a left badge', () => {
    const roundStart = row({ historyEntryKind: 'round-start', currentRound: 6 })
    expect(isRoundStartHistoryEntry(roundStart)).toBe(true)
    expect(getRoundStartLabel(roundStart)).toBe('Round 6 start')
    expect(getHistoryRowBadge(roundStart, 4, [roundStart])).toBe('')
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

  it('getBirdseyeHistoryCellParts labels reveal and agent destinations', () => {
    expect(
      getBirdseyeHistoryCellParts(
        row({
          phase: GamePhase.PLAYER_TURNS,
          currTurn: { playerId: 0, type: TurnType.REVEAL },
        })
      )
    ).toEqual({ action: 'Reveal' })
    const space = BOARD_SPACES[0]
    expect(
      getBirdseyeHistoryCellParts(
        row({
          phase: GamePhase.PLAYER_TURNS,
          currTurn: { playerId: 0, type: TurnType.ACTION, agentSpaceId: space.id },
          players: [],
        })
      )
    ).toEqual({ action: space.name })
  })
})

describe('buildBirdseyeTurnHistoryGrid', () => {
  const playerIds = [0, 1, 2, 3]

  function playerTurn(playerId: number, type: TurnType = TurnType.ACTION): GameState {
    return row({
      phase: GamePhase.PLAYER_TURNS,
      currentRound: 1,
      activePlayerId: playerId,
      currTurn: { playerId, type },
    })
  }

  it('fills one row in leader-column order', () => {
    const history = [
      row({ historyEntryKind: 'round-start', currentRound: 1, phase: GamePhase.PLAYER_TURNS }),
      playerTurn(0),
      playerTurn(1),
      playerTurn(2),
      playerTurn(3),
    ]
    const grid = buildBirdseyeTurnHistoryGrid(history, playerIds)
    expect(grid).toHaveLength(2)
    expect(grid[0]).toMatchObject({ type: 'banner', banner: { kind: 'round-start', label: 'Round 1 start' } })
    expect(grid[1]).toMatchObject({ type: 'turns' })
    if (grid[1].type !== 'turns') throw new Error('expected turns row')
    expect(grid[1].cells.map(cell => cell?.playerId ?? null)).toEqual([0, 1, 2, 3])
    expect(grid[1].cells.map(cell => cell?.historyIndex)).toEqual([1, 2, 3, 4])
  })

  it('starts a fresh row at round end so first-player rotation stays aligned', () => {
    const history = [
      row({ historyEntryKind: 'round-start', currentRound: 1 }),
      playerTurn(0),
      playerTurn(1),
      playerTurn(2),
      row({ historyEntryKind: 'round-start', currentRound: 2 }),
      playerTurn(3),
    ]
    const grid = buildBirdseyeTurnHistoryGrid(history, playerIds)
    const turnRows = grid.filter(rowItem => rowItem.type === 'turns')
    expect(turnRows).toHaveLength(2)
    if (turnRows[0].type !== 'turns' || turnRows[1].type !== 'turns') throw new Error('expected turns')
    expect(turnRows[0].cells.map(cell => cell?.playerId ?? null)).toEqual([0, 1, 2, null])
    expect(turnRows[1].cells.map(cell => cell?.playerId ?? null)).toEqual([null, null, null, 3])
  })

  it('keeps round-2 first player in their leader column', () => {
    const history = [
      row({ historyEntryKind: 'round-start', currentRound: 1 }),
      playerTurn(0),
      playerTurn(1),
      playerTurn(2),
      playerTurn(3),
      row({ historyEntryKind: 'combat', currentRound: 1 }),
      row({ historyEntryKind: 'round-start', currentRound: 2 }),
      playerTurn(1),
      playerTurn(2),
      playerTurn(3),
      playerTurn(0),
    ]
    const grid = buildBirdseyeTurnHistoryGrid(history, playerIds)
    const turnRows = grid.filter(rowItem => rowItem.type === 'turns')
    expect(turnRows).toHaveLength(2)
    if (turnRows[1].type !== 'turns') throw new Error('expected turns')
    expect(turnRows[1].cells.map(cell => cell?.playerId ?? null)).toEqual([0, 1, 2, 3])
    expect(turnRows[1].cells.map(cell => cell?.historyIndex)).toEqual([10, 7, 8, 9])
  })

  it('opens a new row when the same player acts twice in a cycle', () => {
    const history = [playerTurn(0), playerTurn(0)]
    const grid = buildBirdseyeTurnHistoryGrid(history, playerIds)
    expect(grid).toHaveLength(2)
    if (grid[0].type !== 'turns' || grid[1].type !== 'turns') throw new Error('expected turns')
    expect(grid[0].cells[0]?.historyIndex).toBe(0)
    expect(grid[1].cells[0]?.historyIndex).toBe(1)
  })

  it('appends the live in-progress turn in the active player column', () => {
    const history = [
      row({ historyEntryKind: 'round-start', currentRound: 1 }),
      playerTurn(0),
    ]
    const live = playerTurn(1)
    const grid = buildBirdseyeTurnHistoryGrid(history, playerIds, live)
    const turnRows = grid.filter(rowItem => rowItem.type === 'turns')
    expect(turnRows).toHaveLength(1)
    if (turnRows[0].type !== 'turns') throw new Error('expected turns')
    expect(turnRows[0].cells[0]?.isLive).toBe(false)
    expect(turnRows[0].cells[1]?.isLive).toBe(true)
    expect(turnRows[0].cells[1]?.historyIndex).toBe(2)
  })
})

describe('groupBirdseyeHistoryRounds', () => {
  const playerIds = [0, 1, 2, 3]

  function playerTurn(playerId: number, type: TurnType = TurnType.ACTION): GameState {
    return row({
      phase: GamePhase.PLAYER_TURNS,
      currentRound: 1,
      activePlayerId: playerId,
      currTurn: { playerId, type },
    })
  }

  it('keeps combat with the preceding round and starts a new group at the next round', () => {
    const history = [
      row({ historyEntryKind: 'round-start', currentRound: 1 }),
      playerTurn(0),
      playerTurn(1),
      row({ historyEntryKind: 'combat', currentRound: 1 }),
      row({ historyEntryKind: 'round-start', currentRound: 2 }),
      playerTurn(2),
    ]
    const groups = groupBirdseyeHistoryRounds(buildBirdseyeTurnHistoryGrid(history, playerIds))
    expect(groups).toHaveLength(2)
    expect(groups[0].round).toBe(1)
    expect(groups[0].rows.map(item => item.type)).toEqual(['banner', 'turns', 'banner'])
    expect(groups[1].round).toBe(2)
    expect(groups[1].rows.map(item => item.type)).toEqual(['banner', 'turns'])
  })

  it('keeps setup as its own group before round 1', () => {
    const history = [
      row({ historyEntryKind: 'setup', currentRound: 1, sandboxSetup: true }),
      row({ historyEntryKind: 'round-start', currentRound: 1, phase: GamePhase.PLAYER_TURNS }),
      playerTurn(0),
    ]
    const groups = groupBirdseyeHistoryRounds(buildBirdseyeTurnHistoryGrid(history, playerIds))
    expect(groups[0].rows[0]).toMatchObject({ type: 'banner', banner: { kind: 'setup' } })
    expect(groups[1].rows[0]).toMatchObject({
      type: 'banner',
      banner: { kind: 'round-start', label: 'Round 1 start' },
    })
  })
})
