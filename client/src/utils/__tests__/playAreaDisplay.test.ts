import { describe, it, expect } from 'vitest'
import {
  AgentIcon,
  ChoiceType,
  CustomEffect,
  GainSource,
  TurnType,
  type Card,
  type GameState,
  type Player,
} from '../../types/GameTypes'
import { getOpponentDiscardableCards, getPlayAreaCardsForTurnView, getRevealedCardIdsForTurnView, getSelectableDeckCards, validateDiscardCostSelection, getDiscardCostPlayability, canPayDiscardCost, getAgentTurnCardsForDisplay, playAreaCardIdsWithPendingEffectChoice, playAreaCardHasPendingEffectHighlight } from '../playAreaDisplay'

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
    expect(canPayDiscardCost(player, 2)).toBe(false)
    expect(canPayDiscardCost({ ...player, handCount: 2 }, 2)).toBe(true)
    expect(validateDiscardCostSelection({ ...player, handCount: 2 }, 2, [1, 2])).toBe(true)
    expect(validateDiscardCostSelection(player, 2, [1, 2])).toBe(false)
    expect(validateDiscardCostSelection({ ...player, handCount: 2 }, 2, [2, 3])).toBe(false)

    const playability = getDiscardCostPlayability({ ...player, handCount: 2 }, 2, [])
    expect(playability(stubCard(1)).playable).toBe(true)
    expect(playability(stubCard(3)).playable).toBe(false)
  })

  it('getRevealedCardIdsForTurnView returns ids only for that player\'s reveal turn', () => {
    const player = stubPlayer({ id: 0, revealed: true })
    const other = stubPlayer({ id: 1, revealed: true })
    const revealState = {
      currTurn: {
        playerId: 0,
        type: TurnType.REVEAL,
        revealedCardIds: [11, 12],
      },
      players: [player],
    } as GameState
    expect(getRevealedCardIdsForTurnView(revealState, player)).toEqual([11, 12])
    expect(getRevealedCardIdsForTurnView(revealState, other)).toEqual([])
    expect(
      getRevealedCardIdsForTurnView(
        { currTurn: { playerId: 0, type: TurnType.ACTION, cardId: 1 }, players: [player] } as GameState,
        player
      )
    ).toEqual([])
  })

  it('playAreaCardIdsWithPendingEffectChoice collects card sources that still need input', () => {
    const gameState = {
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        cardId: 42,
        pendingChoices: [
          {
            id: 'or-42',
            type: ChoiceType.FIXED_OPTIONS,
            prompt: 'Choose',
            options: [],
            source: { type: GainSource.CARD, id: 42, name: 'Spy' },
          },
          {
            id: 'disabled-7',
            type: ChoiceType.FIXED_OPTIONS,
            prompt: 'Skip',
            disabled: true,
            options: [],
            source: { type: GainSource.CARD, id: 7, name: 'Disabled' },
          },
          {
            id: 'board',
            type: ChoiceType.FIXED_OPTIONS,
            prompt: 'Board',
            options: [],
            source: { type: GainSource.BOARD_SPACE, id: 3, name: 'Wealth' },
          },
        ],
        optionalEffects: [
          {
            id: 'opt-11',
            cost: { spice: 2 },
            reward: { troops: 3 },
            source: { type: GainSource.CARD, id: 11, name: 'Fremen Camp' },
          },
        ],
      },
      pendingRewards: [
        {
          id: 'voice-9',
          source: { type: GainSource.CARD, id: 9, name: 'The Voice' },
          reward: { custom: CustomEffect.THE_VOICE },
          isTrash: false,
        },
        {
          id: 'spice-8',
          source: { type: GainSource.CARD, id: 8, name: 'Spice' },
          reward: { spice: 1 },
          isTrash: false,
        },
      ],
    } as GameState

    expect([...playAreaCardIdsWithPendingEffectChoice(gameState)].sort((a, b) => a - b)).toEqual([
      9, 11, 42,
    ])
    expect(playAreaCardIdsWithPendingEffectChoice(gameState, { isHistoryView: true }).size).toBe(0)
    expect(playAreaCardIdsWithPendingEffectChoice(undefined).size).toBe(0)
  })

  it('playAreaCardHasPendingEffectHighlight only rings the active seat (catalog ids are shared)', () => {
    const pending = new Set([10])
    expect(playAreaCardHasPendingEffectHighlight(10, pending, true)).toBe(true)
    expect(playAreaCardHasPendingEffectHighlight(10, pending, false)).toBe(false)
    expect(playAreaCardHasPendingEffectHighlight(11, pending, true)).toBe(false)
    expect(playAreaCardHasPendingEffectHighlight(10, undefined, true)).toBe(false)
  })
})
