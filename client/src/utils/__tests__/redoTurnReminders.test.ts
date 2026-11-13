import { describe, expect, it } from 'vitest'
import { TurnType, type GameState } from '../../types/GameTypes'
import { originalTurnReminders } from '../redoTurnReminders'

describe('originalTurnReminders', () => {
  it('remembers the played card and agent space from an agent turn', () => {
    const turn = {
      currentRound: 1,
      expansions: { riseOfIx: false, riseOfIxEpic: false },
      gains: [],
      imperiumRow: [],
      intrigueDeck: [],
      intrigueDiscard: [],
      currTurn: {
        type: TurnType.ACTION,
        playerId: 0,
        cardId: 7,
        agentSpaceId: 12,
        playedIntrigueCard: [],
        revealedCardIds: [],
        acquiredCards: [],
        acquiredTechTiles: [],
      },
      players: [
        {
          id: 0,
          deck: [],
          discardPile: [],
          trash: [],
          playArea: [{ id: 7, name: 'Dune', image: '/cards/dune.png', agentIcons: [] }],
        },
      ],
    } as unknown as GameState

    const reminders = originalTurnReminders(turn)
    expect(reminders.agentSpaceId).toBe(12)
    expect(reminders.playedCards.map(card => card.name)).toEqual(['Dune'])
    expect(reminders.revealedCards).toEqual([])
  })
})
