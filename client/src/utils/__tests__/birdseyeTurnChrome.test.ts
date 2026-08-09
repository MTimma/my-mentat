import { describe, expect, it } from 'vitest'
import { GainSource, RewardType, type GameState } from '../../types/GameTypes'
import { buildBirdseyeGainsByPlayer } from '../birdseyeTurnChrome'

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    players: [],
    gains: [],
    currTurn: { playerId: 1, gainsStartIndex: 0 } as GameState['currTurn'],
    activePlayerId: 1,
    ...overrides,
  } as GameState
}

describe('buildBirdseyeGainsByPlayer', () => {
  it('splits active and incidental other-player gains', () => {
    const state = baseState({
      gains: [
        {
          playerId: 1,
          source: GainSource.BOARD_SPACE,
          sourceId: 1,
          round: 1,
          name: 'Arrakeen',
          amount: 1,
          type: RewardType.TROOPS,
        },
        {
          playerId: 2,
          source: GainSource.CONTROL,
          sourceId: 1,
          round: 1,
          name: 'Control',
          amount: 1,
          type: RewardType.SOLARI,
        },
        {
          playerId: 3,
          source: GainSource.SHIPPING_TRACK,
          sourceId: 1,
          round: 1,
          name: 'Dividends',
          amount: 2,
          type: RewardType.SOLARI,
        },
      ],
    })

    const byPlayer = buildBirdseyeGainsByPlayer(state)
    expect(byPlayer[1]?.map(g => g.name)).toEqual(['Arrakeen'])
    expect(byPlayer[2]?.map(g => g.name)).toEqual(['Control'])
    expect(byPlayer[3]?.map(g => g.name)).toEqual(['Dividends'])
  })
})
