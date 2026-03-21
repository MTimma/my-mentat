import { Card } from '../types/GameTypes'
import { STARTING_DECK, buildImperiumDeck } from '../data/cards'

const cloneCards = (cards: Card[]): Card[] => cards.map(card => JSON.parse(JSON.stringify(card)))

export const buildStartingDeck = (): Card[] => cloneCards(STARTING_DECK)

export const buildSetupImperiumDeck = (playerDecks: Card[][]): Card[] => {
  const remainingDeck = buildImperiumDeck()
  const reservedByName = playerDecks
    .flat()
    .reduce<Map<string, number>>((counts, card) => {
      counts.set(card.name, (counts.get(card.name) || 0) + 1)
      return counts
    }, new Map())

  return remainingDeck.filter(card => {
    const reservedCount = reservedByName.get(card.name) || 0
    if (reservedCount === 0) {
      return true
    }

    reservedByName.set(card.name, reservedCount - 1)
    return false
  })
}
