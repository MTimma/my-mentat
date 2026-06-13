import { describe, expect, it } from 'vitest'
import { GamePhase } from '../../types/GameTypes'
import { getFreshDefaultGameState } from '../../components/GameContext/GameContext'
import {
  hasEndgameRowContent,
  mergeEndgameHistoryRow,
  shouldHideLiveHistoryEntry,
} from '../endgameHistoryDisplay'

describe('endgameHistoryDisplay', () => {
  it('merges winners from live state into the last empty endgame history row', () => {
    const current = {
      ...getFreshDefaultGameState(),
      phase: GamePhase.END_GAME,
      endgameWinners: [0],
      endgameRevealedIntrigue: { 0: [{ id: 1, name: 'Corner', image: '', agentIcons: [], type: 'endgame' as const, description: '' }] },
    }
    const historyRow = {
      ...getFreshDefaultGameState(),
      historyEntryKind: 'endgame' as const,
      endgameWinners: null,
      endgameRevealedIntrigue: {},
    }

    const merged = mergeEndgameHistoryRow(historyRow, current, true)
    expect(merged.endgameWinners).toEqual([0])
    expect(hasEndgameRowContent(merged)).toBe(true)
  })

  it('hides the live row when the last history row is a complete endgame snapshot', () => {
    const current = {
      ...getFreshDefaultGameState(),
      phase: GamePhase.END_GAME,
      endgameWinners: [1],
    }
    const turns = [
      {
        ...getFreshDefaultGameState(),
        historyEntryKind: 'endgame' as const,
        endgameWinners: [1],
        endgameRevealedIntrigue: { 1: [] },
      },
    ]

    expect(shouldHideLiveHistoryEntry(turns, current)).toBe(true)
  })
})
