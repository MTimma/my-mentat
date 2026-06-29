import { describe, it, expect } from 'vitest'
import { AgentIcon, TurnType, type Card, type GameState, type Player } from '../../types/GameTypes'
import { getOpponentDiscardableCards, getPlayAreaCardsForTurnView, getSelectableDeckCards, validateDiscardCostSelection, getDiscardCostPlayability, isCardInHand, canPayDiscardCost, getAgentTurnCardsForDisplay } from '../playAreaDisplay'

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

  it('getPlayAreaCardsForTurnView resolves both graft pair cards from deck', () => {
    const graftCard = stubCard(101, 'Gene Splicing')
    const partner = stubCard(102, 'Planned Coupling')
    const player = stubPlayer({
      playArea: [],
      deck: [graftCard, partner],
      handCount: 2,
    })
    const gameState = {
      expansions: { immortality: true },
      graftPair: { cardIds: [graftCard.id, partner.id] },
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        cardId: graftCard.id,
      },
      players: [player],
    } as GameState

    expect(getPlayAreaCardsForTurnView(gameState, player).map(c => c.id)).toEqual([
      graftCard.id,
      partner.id,
    ])
  })

  it('getAgentTurnCardsForDisplay returns graft pair while cards are still in deck', () => {
    const graftCard = stubCard(201, 'Dissecting Kit')
    const partner = stubCard(202, 'Blank Slate')
    const player = stubPlayer({
      playArea: [],
      deck: [graftCard, partner],
      handCount: 2,
    })
    const gameState = {
      expansions: { immortality: true },
      graftPair: { cardIds: [graftCard.id, partner.id] },
    } as GameState

    expect(getAgentTurnCardsForDisplay(gameState, player, graftCard).map(c => c.id)).toEqual([
      graftCard.id,
      partner.id,
    ])
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

  it('discard cost helpers require hand cards only', () => {
    const player = stubPlayer({
      deck: [stubCard(1), stubCard(2), stubCard(3), stubCard(4)],
      handCount: 1,
    })
    expect(isCardInHand(player, 1)).toBe(true)
    expect(isCardInHand(player, 2)).toBe(false)
    expect(canPayDiscardCost(player, 2)).toBe(false)
    expect(canPayDiscardCost({ ...player, handCount: 2 }, 2)).toBe(true)
    expect(validateDiscardCostSelection({ ...player, handCount: 2 }, 2, [1, 2])).toBe(true)
    expect(validateDiscardCostSelection(player, 2, [1, 2])).toBe(false)
    expect(validateDiscardCostSelection({ ...player, handCount: 2 }, 2, [2, 3])).toBe(false)

    const playability = getDiscardCostPlayability({ ...player, handCount: 2 }, 2, [])
    expect(playability(stubCard(1)).playable).toBe(true)
    expect(playability(stubCard(3)).playable).toBe(false)
  })
})
