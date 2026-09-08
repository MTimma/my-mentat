import { INTRIGUE_CARDS } from '../catalog/runtime'
import {
  ALL_IMPERIUM_ROW_CARDS,
  ARRAKIS_LIAISON_DECK,
  FOLDSPACE_DECK,
  SPICE_MUST_FLOW_DECK,
  STARTING_DECK,
} from '../data/cards'
import { IMMORTALITY_INTRIGUE_CARDS, RISE_OF_IX_INTRIGUE_CARDS } from '../data/intrigueCards'

type CatalogCardRef = { name: string; image: string }

const deckCardsById = new Map<number, CatalogCardRef>()
const intrigueCardsById = new Map<number, CatalogCardRef>()

function ensureDeckCards() {
  if (deckCardsById.size > 0) return
  for (const card of [
    ...STARTING_DECK,
    ...FOLDSPACE_DECK,
    ...ARRAKIS_LIAISON_DECK,
    ...SPICE_MUST_FLOW_DECK,
    ...ALL_IMPERIUM_ROW_CARDS,
  ]) {
    if (!deckCardsById.has(card.id)) {
      deckCardsById.set(card.id, { name: card.name, image: card.image })
    }
  }
}

function ensureIntrigueCards() {
  if (intrigueCardsById.size > 0) return
  for (const card of [
    ...INTRIGUE_CARDS,
    ...RISE_OF_IX_INTRIGUE_CARDS,
    ...IMMORTALITY_INTRIGUE_CARDS,
  ]) {
    if (!intrigueCardsById.has(card.id)) {
      intrigueCardsById.set(card.id, { name: card.name, image: card.image })
    }
  }
}

/** Imperium / starter / foldspace / reserve card name by static catalog id. */
export function catalogDeckCardNameById(cardId: number): string | undefined {
  ensureDeckCards()
  return deckCardsById.get(cardId)?.name
}

/** Imperium / starter / foldspace / reserve card image by static catalog id. */
export function catalogDeckCardImageById(cardId: number): string | undefined {
  ensureDeckCards()
  const image = deckCardsById.get(cardId)?.image
  return image || undefined
}

/** Intrigue card name by static catalog id. */
export function catalogIntrigueNameById(cardId: number): string | undefined {
  ensureIntrigueCards()
  return intrigueCardsById.get(cardId)?.name
}

/** Intrigue card image by static catalog id. */
export function catalogIntrigueImageById(cardId: number): string | undefined {
  ensureIntrigueCards()
  const image = intrigueCardsById.get(cardId)?.image
  return image || undefined
}
