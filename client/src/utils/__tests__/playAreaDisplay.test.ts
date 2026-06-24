import { describe, it, expect } from 'vitest'
import { AgentIcon, TurnType, type Card, type GameState, type Player } from '../../types/GameTypes'
import { getOpponentDiscardableCards, getPlayAreaCardsForTurnView, getSelectableDeckCards } from '../playAreaDisplay'

function stubCard(id: number, name = `card-${id}`): Card {
  return { id, name, image: '', agentIcons: [AgentIcon.CITY] }
}

function stubPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 0,
    color: 'red' as Player['color'],
    leader: { name: 'Test', ability: { name: 'A', description: 'D' }, signetRingText: 'S', mentat: 1 },
    deck: [],
    discardPile: [],
    playArea: [],
    trash: [],
    handCount: 0,
    agents: 2,
    troops: 3,
    spice: 0,
    water: 0,
    solari: 0,
    intrigueCount: 0,
    victoryPoints: 0,
    revealed: false,
    hasHighCouncilSeat: false,
    ...overrides,
  } as Player
}

describe('playAreaDisplay', () => {
  it('getPlayAreaCardsForTurnView excludes trashed cards still referenced by currTurn.cardId', () => {
    const powerPlay = stubCard(1040, 'Power Play')
    const player = stubPlayer({
      playArea: [],
      trash: [powerPlay],
    })
    const gameState = {
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        cardId: 1040,
      },
      players: [player],
    } as GameState

    expect(getPlayAreaCardsForTurnView(gameState, player)).toEqual([])
  })

  it('getSelectableDeckCards returns the full deck regardless of handCount', () => {
    const player = stubPlayer({
      deck: [stubCard(1), stubCard(2), stubCard(3), stubCard(4), stubCard(5)],
      handCount: 2,
      playArea: [],
    })
    expect(getSelectableDeckCards(player).map(c => c.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('getOpponentDiscardableCards returns the opponent deck', () => {
    const player = stubPlayer({
      deck: [stubCard(1), stubCard(2), stubCard(3), stubCard(4)],
      handCount: 2,
      playArea: [stubCard(5)],
    })

    expect(getOpponentDiscardableCards(player).map(c => c.id)).toEqual([1, 2, 3, 4])
  })
})
