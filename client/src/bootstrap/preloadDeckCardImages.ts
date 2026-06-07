import {
  ARRAKIS_LIAISON_DECK,
  FOLDSPACE_DECK,
  IMPERIUM_ROW_DECK,
  SPICE_MUST_FLOW_DECK,
  STARTING_DECK,
} from '../data/cards'
import { CONFLICT_CARD_IMAGE_FILE } from '../data/boardMarkerAnchors'
import { schedulePreloadImageUrls } from './preloadImages'

const DECK_CARD_SOURCES = [
  STARTING_DECK,
  IMPERIUM_ROW_DECK,
  ARRAKIS_LIAISON_DECK,
  SPICE_MUST_FLOW_DECK,
  FOLDSPACE_DECK,
] as const

const EXTRA_CARD_IMAGE_URLS = [
  'imperium_row/arrakis_liaison.avif',
  'imperium_row/spice_must_flow.avif',
] as const

function collectDeckCardImageUrls(): string[] {
  const urls = new Set<string>(EXTRA_CARD_IMAGE_URLS)
  for (const deck of DECK_CARD_SOURCES) {
    for (const card of deck) {
      if (card.image) urls.add(card.image)
    }
  }
  for (const filename of Object.values(CONFLICT_CARD_IMAGE_FILE)) {
    if (filename) urls.add(`/conflicts/cards/${filename}`)
  }
  return [...urls]
}

const DECK_CARD_IMAGE_URLS = collectDeckCardImageUrls()

export function preloadDeckCardImages(): void {
  schedulePreloadImageUrls(DECK_CARD_IMAGE_URLS)
}
