import { Card, Expansions, NO_EXPANSIONS } from '../types/GameTypes'
import { createCatalogRuntime, STARTING_DECK, buildImperiumDeck } from '../catalog/runtime'
import { resolveGamePack } from '../gamePacks/resolveGamePack'
import type { GamePackRef } from '../gamePacks/types'

const cloneCards = (cards: Card[]): Card[] => cards.map(card => JSON.parse(JSON.stringify(card)))

export const buildStartingDeck = (gamePackId?: GamePackRef): Card[] => {
  if (!gamePackId) return cloneCards(STARTING_DECK)
  const runtime = createCatalogRuntime(resolveGamePack(gamePackId))
  return cloneCards(runtime.resolveCatalogCardIds(runtime.slices.decks.starting))
}

/**
 * Removes copies from `imperiumDeck` that are reserved by player starter decks (matched by card name),
 * same rules as the default Imperium setup.
 */
export const applyStarterDeckReservationToImperium = (
  imperiumDeck: Card[],
  playerDecks: Card[][]
): Card[] => {
  const remainingDeck = cloneCards(imperiumDeck)
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

export const buildSetupImperiumDeck = (
  playerDecks: Card[][],
  expansions: Expansions = NO_EXPANSIONS
): Card[] =>
  applyStarterDeckReservationToImperium(buildImperiumDeck(expansions), playerDecks)
