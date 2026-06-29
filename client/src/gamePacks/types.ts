import type { Expansions } from '../types/GameTypes'
import type { CatalogCardEntry, CatalogEffectEntry, CatalogIntrigueEntry, CatalogSpaceEntry } from '../catalog/buildCatalog'
import type { ConflictCard } from '../types/GameTypes'
import type { BoardSetId } from '../expansions/types'

export const GAME_PACK_SCHEMA_VERSION = 1

export type GamePackRef = string

export type PlayerMode = 'standard' | 'uprising-3v3'

export interface GamePackStructure {
  expansions: Expansions
  playerMode: PlayerMode
  /**
   * Base board the pack uses. Missing ⇒ `'imperium'` (backwards compatible).
   * Expansions read this to pick the correct anchor table.
   */
  boardSet?: BoardSetId
}

export interface GamePackOverrides {
  effects: Record<string, Partial<CatalogEffectEntry>>
  cards: Record<string, Partial<CatalogCardEntry>>
  boardSpaces: Record<string, Partial<CatalogSpaceEntry>>
  intrigue: Record<string, Partial<CatalogIntrigueEntry>>
  conflicts: Record<string, Partial<ConflictCard>>
}

export interface GamePackAdditions {
  cards: CatalogCardEntry[]
  intrigue: CatalogIntrigueEntry[]
  deckPatches: Record<
    string,
    {
      append?: string[]
      prepend?: string[]
      /** Replace every occurrence of a catalog id with another (e.g. Immortality swaps Dune → Experimentation). */
      replace?: Record<string, string>
    }
  >
}

export interface GamePackManifest {
  schemaVersion: number
  id: string
  version: number
  label: string
  catalogVersion: number
  extends: GamePackRef | null
  structure: GamePackStructure
  overrides: GamePackOverrides
  additions: GamePackAdditions
}

export interface ResolvedGamePack {
  ref: GamePackRef
  catalogVersion: number
  label: string
  structure: GamePackStructure
  overrides: GamePackOverrides
  additions: GamePackAdditions
}

export interface SelectableGamePackEntry {
  ref: GamePackRef
  label: string
  file: string
}

export interface GamePackIndex {
  schemaVersion: number
  selectable: SelectableGamePackEntry[]
  reserved: string[]
}
