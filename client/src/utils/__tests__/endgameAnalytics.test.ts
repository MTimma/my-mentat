import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { getFreshDefaultGameState } from '../../components/GameContext/GameContext'
import { makePlayer } from '../../components/GameContext/__tests__/_helpers'
import { TurnType } from '../../types/GameTypes'
import { buildEndgameGameStatistics } from '../endgameAnalytics'

describe('buildEndgameGameStatistics', () => {
  it('aggregates agent plays, board visits, and reveal acquisitions from history', () => {
    const wealthSpace = BOARD_SPACES.find(s => s.name === 'Wealth')!
    const playedCard = { id: 101, name: 'Played Card', image: '', agentIcons: [] }
    const acquiredCard = { id: 202, name: 'Acquired Card', image: '', agentIcons: [], cost: 3 }
    let current = getFreshDefaultGameState()
    const basePlayers = [
      makePlayer(0, { deck: [playedCard] }),
      makePlayer(1, { id: 1 }),
    ]
    current = {
      ...current,
      players: basePlayers,
      history: [
        {
          ...current,
          players: basePlayers,
          history: [],
          currTurn: {
            playerId: 0,
            type: TurnType.ACTION,
            cardId: 101,
            agentSpaceId: wealthSpace.id,
          },
        },
        {
          ...current,
          players: basePlayers,
          history: [],
          currTurn: {
            playerId: 0,
            type: TurnType.REVEAL,
            revealedCardIds: [101],
            acquiredCards: [acquiredCard],
          },
          gains: [],
        },
      ],
    }

    const stats = buildEndgameGameStatistics(current.history, current)
    expect(stats[0].agentTurns).toBe(1)
    expect(stats[0].revealTurns).toBe(1)
    expect(stats[0].cardsPlayed[0]?.cardName).toBe('Played Card')
    expect(stats[0].boardVisits[0]?.spaceName).toBe('Wealth')
    expect(stats[0].cardsAcquired.some(c => c.cardName === 'Acquired Card')).toBe(true)
    expect(stats[0].cardsRevealed.some(c => c.cardName === 'Played Card')).toBe(true)
  })
})
