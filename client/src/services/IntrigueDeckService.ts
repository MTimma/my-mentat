import { IntrigueCard, CustomEffect, Expansions, NO_EXPANSIONS } from '../types/GameTypes'
import { INTRIGUE_CARDS } from '../catalog/runtime'
import { RISE_OF_IX_INTRIGUE_CARDS } from '../data/intrigueCards'

export { RISE_OF_IX_INTRIGUE_CARDS } from '../data/intrigueCards'

/** Runtime intrigue deck — hydrated from public/catalogs/intrigue.v1.json + effects.v1.json */
export const intrigueCards: IntrigueCard[] = INTRIGUE_CARDS

export function buildIntrigueDeck(expansions: Expansions = NO_EXPANSIONS): IntrigueCard[] {
  return expansions.riseOfIx
    ? [...INTRIGUE_CARDS, ...RISE_OF_IX_INTRIGUE_CARDS]
    : [...INTRIGUE_CARDS]
}

export function ALL_INTRIGUE_CARDS(expansions: Expansions = NO_EXPANSIONS): IntrigueCard[] {
  return buildIntrigueDeck(expansions)
}

/** Resolve static intrigue definition by a custom effect marker (avoids hard-coded card ids in reducers). */
export function getIntrigueCardByCustom(
  effect: CustomEffect,
  expansions: Expansions = NO_EXPANSIONS
): IntrigueCard | undefined {
  return ALL_INTRIGUE_CARDS(expansions).find(c =>
    c.playEffect?.some(e => e.reward?.custom === effect)
  )
}

export class IntrigueDeckService {
  private deck: IntrigueCard[]
  private discardPile: IntrigueCard[]

  constructor() {
    this.deck = [...intrigueCards]
    this.discardPile = []
    this.shuffle()
  }

  private shuffle(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]
    }
  }

  drawCard(): IntrigueCard | null {
    if (this.deck.length === 0) {
      if (this.discardPile.length === 0) return null
      this.deck = [...this.discardPile]
      this.discardPile = []
      this.shuffle()
    }
    return this.deck.pop() || null
  }

  discardCard(card: IntrigueCard): void {
    this.discardPile.push(card)
  }

  getDeckSize(): number {
    return this.deck.length
  }

  getDiscardSize(): number {
    return this.discardPile.length
  }
}
