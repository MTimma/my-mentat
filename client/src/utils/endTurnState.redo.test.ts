import { describe, expect, it } from 'vitest'
import { GamePhase, type RedoConflict } from '../types/GameTypes'
import { computeCanEndTurn } from './endTurnState'

const conflict: RedoConflict = {
  turnIndex: 2,
  eventIndex: 0,
  reason: 'occupied_space',
  message: 'The board space is no longer available.',
}

describe('computeCanEndTurn redo prompt', () => {
  const openTurn = {
    phase: GamePhase.MAKERS,
    currTurn: null,
    pendingRewards: [],
  }

  it('returns a boolean and blocks while a redo conflict is open', () => {
    expect(computeCanEndTurn(openTurn)).toBe(true)
    expect(computeCanEndTurn({ ...openTurn, redoConflict: conflict })).toBe(false)
  })
})
