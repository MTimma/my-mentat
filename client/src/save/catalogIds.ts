/**
 * Map live Card objects to stable catalog ids (`<pool>/<name-slug>`).
 */
import type { Card } from '../types/GameTypes'
import cardsFile from '../../public/catalogs/cards.v1.json'
import { slugify, type CardPool, type CatalogCardEntry } from '../catalog/buildCatalog'
import type { CardsCatalogFile } from '../catalog/runtime/types'

const cardsCatalog = cardsFile as CardsCatalogFile

const POOL_ORDER: CardPool[] = [
  'starting',
  'imperium',
  'arrakis-liaison',
  'spice-must-flow',
  'foldspace',
]

let nameToCatalogId: Map<string, string> | null = null

function ensureNameIndex(): Map<string, string> {
  if (!nameToCatalogId) {
    nameToCatalogId = new Map()
    for (const pool of POOL_ORDER) {
      for (const catalogId of cardsCatalog.decks[pool]) {
        if (!nameToCatalogId.has(catalogId.split('/')[1])) {
          nameToCatalogId.set(
            cardsCatalog.cards.find(c => c.id === catalogId)?.name ?? '',
            catalogId
          )
        }
      }
    }
    for (const card of cardsCatalog.cards as CatalogCardEntry[]) {
      if (!nameToCatalogId.has(card.name)) {
        nameToCatalogId.set(card.name, card.id)
      }
    }
  }
  return nameToCatalogId
}

/** Resolve a card to a catalog id, preferring `preferredPool` when the name exists there. */
export function catalogIdForCard(card: Card, preferredPool?: CardPool): string {
  if (preferredPool) {
    const preferredId = `${preferredPool}/${slugify(card.name)}`
    if (cardsCatalog.cards.some(c => c.id === preferredId && c.name === card.name)) {
      return preferredId
    }
  }
  const mapped = ensureNameIndex().get(card.name)
  if (mapped) return mapped
  return `unknown/${slugify(card.name)}`
}

export function catalogIdsForCards(cards: Card[], preferredPool?: CardPool): string[] {
  return cards.map(card => catalogIdForCard(card, preferredPool))
}
