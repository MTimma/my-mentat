import type { Expansions } from '../types/GameTypes'
import type { CatalogCardEntry, CatalogEffectEntry, CatalogIntrigueEntry, CatalogSpaceEntry } from '../catalog/buildCatalog'
import type { ConflictCard } from '../types/GameTypes'

export const GAME_PACK_SCHEMA_VERSION = 1

export type GamePackRef = string

export type PlayerMode = 'standard' | 'uprising-3v3'

export interface GamePackStructure {
  expansions: Expansions
  playerMode: PlayerMode
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
  deckPatches: Record<string, { append?: string[]; prepend?: string[] }>
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
