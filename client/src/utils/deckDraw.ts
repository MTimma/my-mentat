import type { Card, Player } from '../types/GameTypes'

export const ROUND_START_HAND_SIZE = 5

export type DeckDrawResult = {
  deck: Card[]
  discardPile: Card[]
  handCount: number
  /** Cards actually moved into hand (may be less than requested). */
  drawn: number
}

type DeckPiles = Pick<Player, 'deck' | 'discardPile' | 'handCount'>

/**
 * Draw up to `count` cards into hand. Hand = deck[0..handCount-1]; the rest is the draw pile.
 * When handCount + count exceeds deck.length, append all discard cards to deck (no shuffle).
 */
export function drawCardsFromDeck(player: DeckPiles, count: number): DeckDrawResult {
  if (count <= 0) {
    return {
      deck: player.deck,
      discardPile: player.discardPile,
      handCount: player.handCount,
      drawn: 0,
    }
  }

  const deck = [...player.deck]
  const discardPile = [...player.discardPile]
  let handCount = player.handCount

  if (handCount + count > deck.length && discardPile.length > 0) {
    deck.push(...discardPile)
    discardPile.length = 0
  }

  const cardsInDrawPile = Math.max(0, deck.length - handCount)
  const drawn = Math.min(count, cardsInDrawPile)
  handCount += drawn

  return {
    deck,
    discardPile,
    handCount,
    drawn,
  }
}

/** Apply a draw reward, returning an updated player copy. */
export function applyDrawCardsToPlayer<T extends DeckPiles>(
  player: T,
  count: number
): T & DeckPiles & { drawn: number } {
  const result = drawCardsFromDeck(player, count)
  return {
    ...player,
    deck: result.deck,
    discardPile: result.discardPile,
    handCount: result.handCount,
    drawn: result.drawn,
  }
}

/** Recall / round start: draw a fresh hand of five from deck + discard. */
export function drawRoundStartHand<T extends DeckPiles & { revealed?: boolean }>(player: T): T {
  const drawn = applyDrawCardsToPlayer({ ...player, handCount: 0 }, ROUND_START_HAND_SIZE)
  return {
    ...player,
    deck: drawn.deck,
    discardPile: drawn.discardPile,
    handCount: drawn.handCount,
    revealed: false,
  }
}
