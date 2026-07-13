import { describe, it, expect } from 'vitest'
import { STARTING_DECK } from '../../data/cards'
import { drawCardsFromDeck, drawRoundStartHand, ROUND_START_HAND_SIZE } from '../deckDraw'

const c = (id: number) => structuredClone(STARTING_DECK.find(card => card.id === id)!)

describe('drawCardsFromDeck', () => {
  it('draws from the draw pile without touching discard when enough cards remain', () => {
    const result = drawCardsFromDeck(
      { deck: [c(1), c(2), c(3), c(4), c(5)], discardPile: [c(6)], handCount: 3 },
      2
    )

    expect(result.drawn).toBe(2)
    expect(result.handCount).toBe(5)
    expect(result.deck.map(card => card.id)).toEqual([1, 2, 3, 4, 5])
    expect(result.discardPile.map(card => card.id)).toEqual([6])
  })

  it('moves discard into deck when handCount + drawCount exceeds deck length', () => {
    const result = drawCardsFromDeck(
      { deck: [c(1), c(2), c(3), c(4)], discardPile: [c(5), c(6)], handCount: 4 },
      2
    )

    expect(result.drawn).toBe(2)
    expect(result.handCount).toBe(6)
    expect(result.deck.map(card => card.id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(result.discardPile).toEqual([])
  })

  it('stops at available cards when deck and discard are exhausted', () => {
    const result = drawCardsFromDeck(
      { deck: [c(1), c(2), c(3)], discardPile: [], handCount: 3 },
      2
    )

    expect(result.drawn).toBe(0)
    expect(result.handCount).toBe(3)
  })
})

describe('drawRoundStartHand', () => {
  it(`draws ${ROUND_START_HAND_SIZE} cards and clears revealed`, () => {
    const result = drawRoundStartHand({
      deck: [c(1), c(2), c(3)],
      discardPile: [c(4), c(5), c(6)],
      handCount: 2,
      revealed: true,
    })

    expect(result.handCount).toBe(ROUND_START_HAND_SIZE)
    expect(result.deck.map(card => card.id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(result.discardPile).toEqual([])
    expect(result.revealed).toBe(false)
  })
})
