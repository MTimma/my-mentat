import { describe, expect, it } from 'vitest'
import { PlayerColor } from '../../types/GameTypes'
import { buildInitialState } from '../buildInitialState'
import type { SetupBlock } from '../types'
import {
  OFFICIAL_BASE_PACK,
  OFFICIAL_BASE_RISE_OF_IX_PACK,
} from '../../gamePacks/constants'

const OFFICIAL_STARTING_DECK_IDS = [
  'starting/convincing-argument',
  'starting/convincing-argument',
  'starting/dagger',
  'starting/dagger',
  'starting/diplomacy',
  'starting/dune-the-desert-planet',
  'starting/dune-the-desert-planet',
  'starting/reconnaissance',
  'starting/seek-allies',
  'starting/signet-ring',
]

function makeSetup(overrides: Partial<SetupBlock> = {}): SetupBlock {
  return {
    firstPlayer: 0,
    gamePackId: OFFICIAL_BASE_PACK,
    players: [
      { id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: OFFICIAL_STARTING_DECK_IDS },
      { id: 1, leaderId: 'ilban', color: PlayerColor.BLUE, deckCardIds: OFFICIAL_STARTING_DECK_IDS },
    ],
    initialConflictId: 901,
    ...overrides,
  }
}

describe('buildInitialState game packs', () => {
  it('base pack has no ix board and smaller imperium deck', () => {
    const state = buildInitialState(makeSetup({ gamePackId: OFFICIAL_BASE_PACK }))
    expect(state.expansions.riseOfIx).toBe(false)
    expect(state.ixBoard).toBeUndefined()
    const baseCount = state.imperiumRowDeck.length
    expect(baseCount).toBeGreaterThan(0)

    const roiState = buildInitialState(makeSetup({ gamePackId: OFFICIAL_BASE_RISE_OF_IX_PACK }))
    expect(roiState.expansions.riseOfIx).toBe(true)
    expect(roiState.ixBoard).toBeDefined()
    expect(roiState.imperiumRowDeck.length).toBeGreaterThan(baseCount)
  })

  it('infers riseOfIx from legacy setup.expansions when gamePackId omitted', () => {
    const legacy = makeSetup({
      gamePackId: undefined,
      expansions: { riseOfIx: true, riseOfIxEpic: false },
    })
    const state = buildInitialState(legacy)
    expect(state.expansions.riseOfIx).toBe(true)
    expect(state.ixBoard).toBeDefined()
  })

  it('Princess Yuna Moritani starts with 0 water even if setup saved water: 1', () => {
    const state = buildInitialState(
      makeSetup({
        gamePackId: OFFICIAL_BASE_RISE_OF_IX_PACK,
        players: [
          {
            id: 0,
            leaderId: 'princess-yuna-moritani',
            color: PlayerColor.RED,
            deckCardIds: OFFICIAL_STARTING_DECK_IDS,
            startingResources: { water: 1, spice: 0, solari: 0, troops: 3, victoryPoints: 1 },
          },
        ],
      })
    )
    expect(state.players[0].water).toBe(0)
  })

  it('other leaders default to 1 water when startingResources omitted', () => {
    const state = buildInitialState(
      makeSetup({
        players: [
          { id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: OFFICIAL_STARTING_DECK_IDS },
        ],
      })
    )
    expect(state.players[0].water).toBe(1)
  })
})
