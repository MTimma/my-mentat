import { describe, expect, it } from 'vitest'
import { getFreshDefaultGameState } from '../GameContext'
import { TechTileId } from '../../../data/techTiles'
import { handleActivateTech } from '../riseOfIxReducer'
import { tilesActivatableNow } from '../../../utils/techTiles'
import { GamePhase, NO_EXPANSIONS, TurnType } from '../../../types/GameTypes'
import { makePlayer } from './_helpers'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }

function roiState(overrides: Record<string, unknown> = {}) {
  const base = getFreshDefaultGameState()
  const p0 = makePlayer(0, {
    solari: 20,
    troops: 5,
    tech: [{ id: TechTileId.FLAGSHIP, faceUp: true }],
    deck: [makePlayer(0).deck[0]],
    handCount: 5,
  })
  return {
    ...base,
    expansions: RISE_OF_IX,
    players: [p0, makePlayer(1)],
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    currTurn: { playerId: 0, type: TurnType.ACTION },
    ...overrides,
  }
}

describe('tech tile activation', () => {
  it('ACTIVATE_TECH no-op when riseOfIx false', () => {
    const before = roiState({ expansions: NO_EXPANSIONS })
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.FLAGSHIP,
    })
    expect(after).toBe(before)
    expect(after.players[0].solari).toBe(20)
    expect(after.players[0].troops).toBe(5)
  })

  it('Flagship activation costs 4 solari grants 3 troops', () => {
    const before = roiState()
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.FLAGSHIP,
    })
    expect(after.players[0].solari).toBe(16)
    expect(after.players[0].troops).toBe(8)
    expect(after.players[0].activatedTechThisRound).toEqual([TechTileId.FLAGSHIP])
  })

  it('tile flips face-down after activation', () => {
    const before = roiState()
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.FLAGSHIP,
    })
    expect(after.players[0].tech?.[0]?.faceUp).toBe(false)
  })

  it('not activatable when wrong turn type', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.INVASION_SHIPS, faceUp: true }],
          deck: [makePlayer(0).deck[0]],
          handCount: 5,
        }),
        makePlayer(1),
      ],
      currTurn: { playerId: 0, type: TurnType.REVEAL },
    })
    expect(tilesActivatableNow(before, 0).map(t => t.id)).not.toContain(TechTileId.INVASION_SHIPS)
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.INVASION_SHIPS,
    })
    expect(after).toBe(before)
  })
})
