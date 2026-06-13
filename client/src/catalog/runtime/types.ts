import type { CatalogCardEntry, CatalogEffectEntry, CatalogSpaceEntry, CardPool } from '../buildCatalog'

export interface CardsCatalogFile {
  schemaVersion: number
  cards: CatalogCardEntry[]
  decks: Record<CardPool, string[]>
}

export interface EffectsCatalogFile {
  schemaVersion: number
  effects: CatalogEffectEntry[]
}

export interface BoardSpacesCatalogFile {
  schemaVersion: number
  boardSpaces: CatalogSpaceEntry[]
}

export interface ConflictsCatalogFile {
  schemaVersion: number
  conflicts: import('../../types/GameTypes').ConflictCard[]
}

export interface IntrigueCatalogFile {
  schemaVersion: number
  intrigue: import('../buildCatalog').CatalogIntrigueEntry[]
}
