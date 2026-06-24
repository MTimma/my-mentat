import { describe, expect, it } from 'vitest'
import { PlayerColor } from '../../types/GameTypes'
import { buildInitialState } from '../buildInitialState'
import type { SetupBlock } from '../types'
import {
  OFFICIAL_BASE_PACK,
  OFFICIAL_BASE_RISE_OF_IX_PACK,
} from '../../gamePacks/constants'

const STARTING_DECK_IDS = [
  'starting/the-voice',
  'starting/reverend-mother-mohiam',
  'starting/power-play',
  'starting/other-memory',
  'starting/kwisatz-haderach',
  'starting/fremen-camp',
  'starting/gurney-halleck',
  'starting/liet-kynes',
  'starting/scout',
  'starting/shifting-allegiances',
]

function makeSetup(overrides: Partial<SetupBlock> = {}): SetupBlock {
  return {
    firstPlayer: 0,
    gamePackId: OFFICIAL_BASE_PACK,
    players: [
      { id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: STARTING_DECK_IDS },
      { id: 1, leaderId: 'ilban', color: PlayerColor.BLUE, deckCardIds: STARTING_DECK_IDS },
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
})
