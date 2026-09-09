import {
  ARRAKIS_LIAISON_DECK,
  FOLDSPACE_DECK,
  IMPERIUM_ROW_DECK,
  SPICE_MUST_FLOW_DECK,
  STARTING_DECK,
} from '../data/cards'
import { RISE_OF_IX_IMPERIUM_DECK } from '../data/cardsRiseOfIx'
import {
  IMMORTALITY_IMPERIUM_DECK,
  IMMORTALITY_STARTING_DECK,
  IMMORTALITY_TLEILAXU_DECK,
} from '../data/cardsImmortality'
import { CONFLICT_CARD_IMAGE_FILE } from '../data/conflictCardImages'
import { LEADER_IMAGES } from '../data/leaders'
import { cardThumbSrc } from '../utils/cardThumbSrc'
import { schedulePreloadImageUrls } from './preloadImages'

const DECK_CARD_SOURCES = [
  STARTING_DECK,
  IMPERIUM_ROW_DECK,
  ARRAKIS_LIAISON_DECK,
  SPICE_MUST_FLOW_DECK,
  FOLDSPACE_DECK,
  RISE_OF_IX_IMPERIUM_DECK,
  IMMORTALITY_IMPERIUM_DECK,
  IMMORTALITY_TLEILAXU_DECK,
  IMMORTALITY_STARTING_DECK,
] as const

/** Full-size art that often appears on the board before the user opens a picker. */
const EXTRA_FULL_IMAGE_URLS = [
  'imperium_row/arrakis_liaison.avif',
  'imperium_row/spice_must_flow.avif',
  'imperium_row/foldspace.avif',
] as const

function uniqueCardImages(): string[] {
  const urls = new Set<string>()
  for (const deck of DECK_CARD_SOURCES) {
    for (const card of deck) {
      if (card.image) urls.add(card.image)
    }
  }
  return [...urls]
}

function collectPickerThumbUrls(): string[] {
  const thumbs = new Set<string>()
  for (const image of uniqueCardImages()) {
    thumbs.add(cardThumbSrc(image))
  }
  for (const portrait of Object.values(LEADER_IMAGES)) {
    thumbs.add(cardThumbSrc(portrait))
  }
  return [...thumbs]
}

function collectEarlyFullUrls(): string[] {
  const urls = new Set<string>(EXTRA_FULL_IMAGE_URLS)
  for (const filename of Object.values(CONFLICT_CARD_IMAGE_FILE)) {
    if (filename) urls.add(`/conflicts/cards/${filename}`)
  }
  // Unique base imperium full art — small AVIF set, helps row + zoom after pick.
  for (const card of IMPERIUM_ROW_DECK) {
    if (card.image) urls.add(card.image)
  }
  for (const card of STARTING_DECK) {
    if (card.image) urls.add(card.image)
  }
  return [...urls]
}

/** Warm picker thumbs (expansions included) + early board full art during idle time. */
export function preloadDeckCardImages(): void {
  // Thumbs first — matches CardSearch / LeaderSelect `src`.
  schedulePreloadImageUrls(collectPickerThumbUrls(), { concurrency: 8, idleTimeoutMs: 2500 })
  // Full art second wave — board row, zoom, conflict cards.
  schedulePreloadImageUrls(collectEarlyFullUrls(), { concurrency: 4, idleTimeoutMs: 8000 })
}
