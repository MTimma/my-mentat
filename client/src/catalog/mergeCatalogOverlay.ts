import type { CatalogCardEntry, CatalogEffectEntry, CatalogIntrigueEntry, CatalogSpaceEntry } from './buildCatalog'
import type { ResolvedGamePack } from '../gamePacks/types'
import type { ConflictCard } from '../types/GameTypes'
import type {
  BoardSpacesCatalogFile,
  CardsCatalogFile,
  ConflictsCatalogFile,
  EffectsCatalogFile,
  IntrigueCatalogFile,
} from './runtime/types'

export interface BaseCatalogSlices {
  effects: EffectsCatalogFile['effects']
  cards: CardsCatalogFile['cards']
  decks: CardsCatalogFile['decks']
  boardSpaces: BoardSpacesCatalogFile['boardSpaces']
  conflicts: ConflictsCatalogFile['conflicts']
  intrigue: IntrigueCatalogFile['intrigue']
}

export interface MergedCatalogSlices extends BaseCatalogSlices {}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const result = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    const existing = result[key as keyof T]
    if (
      value != null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing != null &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      result[key as keyof T] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
      ) as T[keyof T]
    } else {
      result[key as keyof T] = value as T[keyof T]
    }
  }
  return result
}

function applyEffectOverrides(
  effects: CatalogEffectEntry[],
  overrides: ResolvedGamePack['overrides']['effects']
): CatalogEffectEntry[] {
  if (Object.keys(overrides).length === 0) return effects
  return effects.map(effect => {
    const patch = overrides[effect.id]
    return patch ? deepMerge(effect, patch) : effect
  })
}

function applyRecordOverrides<T extends { id: string | number }>(
  entries: T[],
  overrides: Record<string, Partial<T>>
): T[] {
  if (Object.keys(overrides).length === 0) return entries
  return entries.map(entry => {
    const patch = overrides[String(entry.id)]
    return patch ? deepMerge(entry as Record<string, unknown>, patch as Record<string, unknown>) as T : entry
  })
}

function applyDeckPatches(
  decks: CardsCatalogFile['decks'],
  deckPatches: ResolvedGamePack['additions']['deckPatches']
): CardsCatalogFile['decks'] {
  if (Object.keys(deckPatches).length === 0) return decks
  const next = { ...decks }
  for (const [pool, patch] of Object.entries(deckPatches)) {
    const key = pool as keyof CardsCatalogFile['decks']
    if (!next[key]) continue
    const base = [...next[key]]
  next[key] = [...(patch.prepend ?? []), ...base, ...(patch.append ?? [])]
  }
  return next
}

/** Apply game pack overrides and additions to base catalog slices (does not mutate inputs). */
export function mergeCatalogOverlay(
  base: BaseCatalogSlices,
  pack?: ResolvedGamePack
): MergedCatalogSlices {
  if (!pack) {
    return {
      effects: [...base.effects],
      cards: [...base.cards],
      decks: Object.fromEntries(
        Object.entries(base.decks).map(([pool, ids]) => [pool, [...ids]])
      ) as CardsCatalogFile['decks'],
      boardSpaces: [...base.boardSpaces],
      conflicts: [...base.conflicts],
      intrigue: [...base.intrigue],
    }
  }

  const additionCardIds = new Set(pack.additions.cards.map(c => c.id))
  const cards = [
    ...applyRecordOverrides(base.cards, pack.overrides.cards),
    ...pack.additions.cards.filter(c => !base.cards.some(b => b.id === c.id)),
  ]

  const additionIntrigueIds = new Set(pack.additions.intrigue.map(i => i.id))
  const intrigue = [
    ...applyRecordOverrides(base.intrigue, pack.overrides.intrigue),
    ...pack.additions.intrigue.filter(i => !base.intrigue.some(b => b.id === i.id)),
  ]

  // Collect effect ids from added cards/intrigue for additions phase 2
  void additionCardIds
  void additionIntrigueIds

  const decks = Object.fromEntries(
    Object.entries(applyDeckPatches(base.decks, pack.additions.deckPatches)).map(([pool, ids]) => [
      pool,
      [...ids],
    ])
  ) as CardsCatalogFile['decks']

  return {
    effects: applyEffectOverrides(base.effects, pack.overrides.effects),
    cards,
    decks,
    boardSpaces: applyRecordOverrides(base.boardSpaces, pack.overrides.boardSpaces),
    conflicts: applyRecordOverrides(base.conflicts, pack.overrides.conflicts),
    intrigue,
  }
}
