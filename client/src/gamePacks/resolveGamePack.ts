import type { Expansions } from '../types/GameTypes'
import { normalizeExpansions } from '../types/GameTypes'
import type {
  GamePackAdditions,
  GamePackManifest,
  GamePackOverrides,
  GamePackRef,
  GamePackStructure,
  ResolvedGamePack,
} from './types'
import { getGamePackManifest, parseGamePackRef, toGamePackRef } from './registry'

export class GamePackResolutionError extends Error {}

const MAX_EXTENDS_DEPTH = 8

const EMPTY_OVERRIDES: GamePackOverrides = {
  effects: {},
  cards: {},
  boardSpaces: {},
  intrigue: {},
  conflicts: {},
}

const EMPTY_ADDITIONS: GamePackAdditions = {
  cards: [],
  intrigue: [],
  deckPatches: {},
}

function mergePartialRecord<T extends Record<string, unknown>>(
  base: Record<string, Partial<T>>,
  patch: Record<string, Partial<T>>
): Record<string, Partial<T>> {
  const merged = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = { ...(merged[key] ?? {}), ...value } as Partial<T>
  }
  return merged
}

function mergeOverrides(parent: GamePackOverrides, child: GamePackOverrides): GamePackOverrides {
  return {
    effects: mergePartialRecord(parent.effects ?? {}, child.effects ?? {}),
    cards: mergePartialRecord(parent.cards ?? {}, child.cards ?? {}),
    boardSpaces: mergePartialRecord(parent.boardSpaces ?? {}, child.boardSpaces ?? {}),
    intrigue: mergePartialRecord(parent.intrigue ?? {}, child.intrigue ?? {}),
    conflicts: mergePartialRecord(parent.conflicts ?? {}, child.conflicts ?? {}),
  }
}

function mergeAdditions(parent: GamePackAdditions, child: GamePackAdditions): GamePackAdditions {
  const deckPatches = { ...(parent.deckPatches ?? {}) }
  for (const [pool, patch] of Object.entries(child.deckPatches ?? {})) {
    const existing = deckPatches[pool] ?? {}
    deckPatches[pool] = {
      append: [...(existing.append ?? []), ...(patch.append ?? [])],
      prepend: [...(patch.prepend ?? []), ...(existing.prepend ?? [])],
    }
  }
  return {
    cards: [...(parent.cards ?? []), ...(child.cards ?? [])],
    intrigue: [...(parent.intrigue ?? []), ...(child.intrigue ?? [])],
    deckPatches,
  }
}

function mergeStructure(parent: GamePackStructure, child: GamePackStructure): GamePackStructure {
  return {
    playerMode: child.playerMode ?? parent.playerMode,
    expansions: normalizeExpansions({
      ...parent.expansions,
      ...child.expansions,
    }),
  }
}

function loadManifestChain(ref: GamePackRef, depth = 0): GamePackManifest[] {
  if (depth > MAX_EXTENDS_DEPTH) {
    throw new GamePackResolutionError(`Game pack extends chain too deep: ${ref}`)
  }
  const manifest = getGamePackManifest(ref)
  if (!manifest) {
    throw new GamePackResolutionError(`Unknown game pack: ${ref}`)
  }
  const { id, version } = parseGamePackRef(ref)
  if (manifest.id !== id || manifest.version !== version) {
    throw new GamePackResolutionError(`Game pack ref mismatch for ${ref}`)
  }
  if (!manifest.extends) {
    return [manifest]
  }
  return [...loadManifestChain(manifest.extends, depth + 1), manifest]
}

function foldManifests(chain: GamePackManifest[]): ResolvedGamePack {
  const root = chain[0]
  const rootOverrides = root.overrides ?? EMPTY_OVERRIDES
  const rootAdditions = root.additions ?? EMPTY_ADDITIONS
  let structure = { ...root.structure, expansions: normalizeExpansions(root.structure.expansions) }
  let overrides: GamePackOverrides = {
    effects: { ...(rootOverrides.effects ?? {}) },
    cards: { ...(rootOverrides.cards ?? {}) },
    boardSpaces: { ...(rootOverrides.boardSpaces ?? {}) },
    intrigue: { ...(rootOverrides.intrigue ?? {}) },
    conflicts: { ...(rootOverrides.conflicts ?? {}) },
  }
  let additions: GamePackAdditions = {
    cards: [...(rootAdditions.cards ?? [])],
    intrigue: [...(rootAdditions.intrigue ?? [])],
    deckPatches: { ...(rootAdditions.deckPatches ?? {}) },
  }
  let catalogVersion = root.catalogVersion
  let label = root.label

  for (let i = 1; i < chain.length; i++) {
    const manifest = chain[i]
    structure = mergeStructure(structure, manifest.structure)
    overrides = mergeOverrides(overrides, manifest.overrides ?? EMPTY_OVERRIDES)
    additions = mergeAdditions(additions, manifest.additions ?? EMPTY_ADDITIONS)
    catalogVersion = manifest.catalogVersion
    label = manifest.label
  }

  const leaf = chain[chain.length - 1]
  return {
    ref: toGamePackRef(leaf),
    catalogVersion,
    label,
    structure,
    overrides,
    additions,
  }
}

/** Resolve a game pack ref to a fully merged manifest (extends chain applied). */
export function resolveGamePack(ref: GamePackRef): ResolvedGamePack {
  return foldManifests(loadManifestChain(ref))
}

/** Expansions from a pack ref without retaining the full resolved pack. */
export function expansionsForGamePack(ref: GamePackRef): Expansions {
  return resolveGamePack(ref).structure.expansions
}
