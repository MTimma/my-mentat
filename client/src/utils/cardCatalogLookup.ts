import { INTRIGUE_CARDS } from '../catalog/runtime'
import { ALL_IMPERIUM_ROW_CARDS, FOLDSPACE_DECK, STARTING_DECK } from '../data/cards'
import { IMMORTALITY_INTRIGUE_CARDS, RISE_OF_IX_INTRIGUE_CARDS } from '../data/intrigueCards'

const deckCardNamesById = new Map<number, string>()
const intrigueNamesById = new Map<number, string>()

function ensureDeckCardNames() {
  if (deckCardNamesById.size > 0) return
  for (const card of [...STARTING_DECK, ...FOLDSPACE_DECK, ...ALL_IMPERIUM_ROW_CARDS]) {
    if (!deckCardNamesById.has(card.id)) {
      deckCardNamesById.set(card.id, card.name)
    }
  }
}

function ensureIntrigueNames() {
  if (intrigueNamesById.size > 0) return
  for (const card of [
    ...INTRIGUE_CARDS,
    ...RISE_OF_IX_INTRIGUE_CARDS,
    ...IMMORTALITY_INTRIGUE_CARDS,
  ]) {
    if (!intrigueNamesById.has(card.id)) {
      intrigueNamesById.set(card.id, card.name)
    }
  }
}

/** Imperium / starter / foldspace card name by static catalog id. */
export function catalogDeckCardNameById(cardId: number): string | undefined {
  ensureDeckCardNames()
  return deckCardNamesById.get(cardId)
}

/** Intrigue card name by static catalog id. */
export function catalogIntrigueNameById(cardId: number): string | undefined {
  ensureIntrigueNames()
  return intrigueNamesById.get(cardId)
}
