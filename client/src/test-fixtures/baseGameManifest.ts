import manifestJson from './base-game-manifest.json'
import { STARTING_DECK } from '../data/cards'

export interface ManifestCardEntry {
  excelName: string
  codeName: string
  testId: string
  qty?: number | string
  cost?: number | string
  agentIcons?: string
  agentBox?: string
  revealPersuasion?: string
  revealSwords?: string
  type?: string
  benefit?: string
  stage?: number | string
  firstPrize?: string
}

export interface BaseGameManifest {
  source: string
  filter: string
  rules: { pdf: string; doc: string }
  imperiumRow: ManifestCardEntry[]
  startingDeck: ManifestCardEntry[]
  reserve: string[]
  intrigue: ManifestCardEntry[]
  conflicts: ManifestCardEntry[]
  leaders: ManifestCardEntry[]
  nameAliases: Record<string, string | null>
}

export const baseGameManifest = manifestJson as BaseGameManifest

/** Starting-deck card names from code (not in IR spreadsheet tab). */
export const STARTING_DECK_NAMES = STARTING_DECK.map(c => c.name)

export function resolveCodeName(excelName: string): string | null {
  const alias = baseGameManifest.nameAliases[excelName]
  if (alias === null) return null
  return alias ?? excelName
}
