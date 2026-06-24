import { describe, expect, it } from 'vitest'
import { PlayerColor } from '../../types/GameTypes'
import { OFFICIAL_BASE_PACK } from '../../gamePacks/constants'
import { LEADERS } from '../../data/leaders'
import { STARTING_DECK } from '../../data/cards'
import { buildSetupBlockFromConfiguration } from '../buildSetupBlock'
import { createGameInputDoc } from '../createGameInput'
import { buildInitialState } from '../buildInitialState'

describe('buildSetupBlockFromConfiguration', () => {
  it('produces a SaveDoc-compatible setup with catalog ids', () => {
    const leader = LEADERS[0]
    const deck = STARTING_DECK.slice(0, 10)
    const { setup, unmapped } = buildSetupBlockFromConfiguration({
      players: [
        {
          id: 0,
          leader,
          color: PlayerColor.RED,
          spice: 2,
          water: 1,
          solari: 1,
          troops: 3,
          combatValue: 0,
          agents: 2,
          handCount: 5,
          intrigueCount: 0,
          deck: [...deck],
          discardPile: [],
          trash: [],
          hasHighCouncilSeat: false,
          hasSwordmaster: false,
          playArea: [],
          persuasion: 0,
          victoryPoints: 1,
          revealed: false,
        },
      ],
      firstPlayer: 0,
      imperiumRowDeck: [],
      currentRound: 3,
      gamePackId: OFFICIAL_BASE_PACK,
    })
    expect(unmapped).toEqual([])
    expect(setup.currentRound).toBe(3)
    expect(setup.gamePackId).toBe(OFFICIAL_BASE_PACK)
    expect(setup.players[0].deckCardIds[0]).toMatch(/^starting\//)
    expect(setup.players[0].startingResources?.spice).toBe(2)

    const doc = createGameInputDoc(setup)
    expect(doc.events).toEqual([])
    expect(doc.setup).toEqual(setup)

    const state = buildInitialState(setup)
    expect(state.currentRound).toBe(3)
    expect(state.players[0].spice).toBe(2)
  })
})
