import { Card } from '../types/GameTypes'
import { STARTING_DECK, buildImperiumDeck } from '../data/cards'

const cloneCards = (cards: Card[]): Card[] => cards.map(card => JSON.parse(JSON.stringify(card)))

const countCardsByName = (cards: Card[]): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const card of cards) {
    counts.set(card.name, (counts.get(card.name) || 0) + 1)
  }
  return counts
}

export const buildStartingDeck = (): Card[] => cloneCards(STARTING_DECK)

/** Imperium row deck minus copies players took beyond the default starter deck. */
export const buildSetupImperiumDeck = (playerDecks: Card[][]): Card[] => {
  const remainingDeck = buildImperiumDeck()
  const baselinePerPlayer = countCardsByName(STARTING_DECK)
  const baselineTotalByName = new Map<string, number>()
  for (const [name, count] of baselinePerPlayer) {
    baselineTotalByName.set(name, count * playerDecks.length)
  }

  const actualTotalByName = countCardsByName(playerDecks.flat())
  const reservedByName = new Map<string, number>()
  for (const [name, actual] of actualTotalByName) {
    const baseline = baselineTotalByName.get(name) || 0
    const excess = Math.max(0, actual - baseline)
    if (excess > 0) {
      reservedByName.set(name, excess)
    }
  }

  return remainingDeck.filter(card => {
    const reservedCount = reservedByName.get(card.name) || 0
    if (reservedCount === 0) {
      return true
    }

    reservedByName.set(card.name, reservedCount - 1)
    return false
  })
}
