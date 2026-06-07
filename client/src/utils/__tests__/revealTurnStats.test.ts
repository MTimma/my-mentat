import { describe, it, expect } from 'vitest'
import { AgentIcon, GainSource, RewardType, TurnType, type Card, type GameState } from '../../types/GameTypes'
import { getRevealTurnStats, revealTurnStatsHasContent } from '../revealTurnStats'

function stubCard(id: number, name: string, image = `/cards/${id}.png`): Card {
  return { id, name, image, agentIcons: [AgentIcon.CITY], cost: 2 }
}

describe('revealTurnStats', () => {
  it('resolves revealed card thumbnails and persuasion totals for a reveal turn', () => {
    const convincing = stubCard(101, 'Convincing Argument')
    const initiate = stubCard(102, 'Bene Gesserit Initiate', '/cards/102.png')

    const state = {
      currentRound: 1,
      currTurn: {
        playerId: 0,
        type: TurnType.REVEAL,
        gainsStartIndex: 0,
        revealedCardIds: [101, 101, 102],
        acquiredCards: [],
      },
      gains: [
        {
          playerId: 0,
          round: 1,
          sourceId: 101,
          name: 'Convincing Argument',
          amount: 2,
          type: RewardType.PERSUASION,
          source: GainSource.CARD,
        },
        {
          playerId: 0,
          round: 1,
          sourceId: 101,
          name: 'Convincing Argument',
          amount: 2,
          type: RewardType.PERSUASION,
          source: GainSource.CARD,
        },
        {
          playerId: 0,
          round: 1,
          sourceId: 102,
          name: 'Bene Gesserit Initiate',
          amount: 1,
          type: RewardType.COMBAT,
          source: GainSource.CARD,
        },
      ],
      players: [
        {
          id: 0,
          discardPile: [convincing, initiate],
          deck: [],
          playArea: [],
          trash: [],
          handCount: 0,
        },
      ],
    } as unknown as GameState

    const stats = getRevealTurnStats(state, 0)
    expect(stats).not.toBeNull()
    expect(stats!.revealedCards.map(c => c.id)).toEqual([101, 102])
    expect(stats!.totals.resources.find(r => r.type === RewardType.PERSUASION)?.net).toBe(4)
    expect(stats!.totals.resources.find(r => r.type === RewardType.COMBAT)?.net).toBe(1)
    expect(revealTurnStatsHasContent(stats!)).toBe(true)
  })
})
