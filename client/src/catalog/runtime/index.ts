/**
 * Runtime game data hydrated from published catalogs (public/catalogs/*.v1.json).
 * Authoring still lives in src/data/* — run `npm run generate:catalogs` to refresh JSON.
 *
 * Use `createCatalogRuntime(resolvedGamePack)` when applying game pack overlays;
 * default exports use the base catalog with no overlay.
 */
import type { Card, Expansions, IntrigueCard, SpaceProps } from '../../types/GameTypes'
import { NO_EXPANSIONS } from '../../types/GameTypes'
import type { CatalogCardEntry, CatalogEffectEntry } from '../buildCatalog'
import type { CardsCatalogFile } from './types'
import cardsFile from '../../../public/catalogs/cards.v1.json'
import { defaultCatalogRuntime } from './createCatalogRuntime'

export { createCatalogRuntime, defaultCatalogRuntime, type CatalogRuntime } from './createCatalogRuntime'
export type { BaseCatalogSlices, MergedCatalogSlices } from '../mergeCatalogOverlay'
export { mergeCatalogOverlay } from '../mergeCatalogOverlay'

const cardsCatalog = cardsFile as CardsCatalogFile
const runtime = defaultCatalogRuntime

function buildPoolDeck(pool: keyof CardsCatalogFile['decks']): Card[] {
  return runtime.resolveCatalogCardIds(cardsCatalog.decks[pool])
}

export const STARTING_DECK: Card[] = buildPoolDeck('starting')
export const ARRAKIS_LIAISON_DECK: Card[] = buildPoolDeck('arrakis-liaison')
export const SPICE_MUST_FLOW_DECK: Card[] = buildPoolDeck('spice-must-flow')
export const FOLDSPACE_DECK: Card[] = buildPoolDeck('foldspace')

/** Unique imperium templates (base game only — excludes Rise of Ix and Immortality). */
export const IMPERIUM_ROW_DECK: Card[] = cardsCatalog.cards
  .filter(card => card.pool === 'imperium' && !card.riseOfIx && !card.immortality)
  .map(card => runtime.resolveCatalogCardIds([card.id])[0])

export const ALL_IMPERIUM_ROW_CARDS: Card[] = [...IMPERIUM_ROW_DECK]

export function buildImperiumDeck(expansions: Expansions = NO_EXPANSIONS): Card[] {
  return runtime.buildImperiumDeck(expansions)
}

/** Immortality Tleilaxu Row pool (acquired with specimens; not shuffled into the Imperium deck). */
export function buildTleilaxuPool(): Card[] {
  return runtime.buildTleilaxuPool()
}

export const TLEILAXU_POOL: Card[] = buildTleilaxuPool()

export const BOARD_SPACES: SpaceProps[] = runtime.boardSpaces
export const CONFLICTS = runtime.conflicts
export const INTRIGUE_CARDS: IntrigueCard[] = runtime.intrigueCards

export function resolveCatalogCardIds(catalogIds: string[]): Card[] {
  return runtime.resolveCatalogCardIds(catalogIds)
}

export function getEffectById(effectId: string): CatalogEffectEntry | undefined {
  return runtime.getEffectById(effectId)
}

export function getCatalogCardById(catalogId: string): CatalogCardEntry | undefined {
  return runtime.getCatalogCardById(catalogId)
}
