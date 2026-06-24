import { GAME_PACK_SCHEMA_VERSION, type GamePackManifest } from './types'
import { getGamePackManifest, parseGamePackRef, registerCustomPackManifest, toGamePackRef, unregisterCustomPackManifest } from './registry'
import { GamePackResolutionError, resolveGamePack } from './resolveGamePack'

export class GamePackValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function requireOverrides(value: unknown): GamePackManifest['overrides'] {
  if (value != null && !isRecord(value)) {
    throw new GamePackValidationError('overrides must be an object')
  }
  const source = isRecord(value) ? value : {}
  const normalized: GamePackManifest['overrides'] = {
    effects: {},
    cards: {},
    boardSpaces: {},
    intrigue: {},
    conflicts: {},
  }
  for (const key of ['effects', 'cards', 'boardSpaces', 'intrigue', 'conflicts'] as const) {
    const entry = source[key]
    if (entry == null) continue
    if (!isRecord(entry)) {
      throw new GamePackValidationError(`overrides.${key} must be an object`)
    }
    normalized[key] = entry as GamePackManifest['overrides'][typeof key]
  }
  return normalized
}

function requireAdditions(value: unknown): GamePackManifest['additions'] {
  if (value != null && !isRecord(value)) {
    throw new GamePackValidationError('additions must be an object')
  }
  const source = isRecord(value) ? value : {}
  if (source.cards != null && !Array.isArray(source.cards)) {
    throw new GamePackValidationError('additions.cards must be an array')
  }
  if (source.intrigue != null && !Array.isArray(source.intrigue)) {
    throw new GamePackValidationError('additions.intrigue must be an array')
  }
  if (source.deckPatches != null && !isRecord(source.deckPatches)) {
    throw new GamePackValidationError('additions.deckPatches must be an object')
  }
  return {
    cards: (source.cards as GamePackManifest['additions']['cards']) ?? [],
    intrigue: (source.intrigue as GamePackManifest['additions']['intrigue']) ?? [],
    deckPatches: (source.deckPatches as GamePackManifest['additions']['deckPatches']) ?? {},
  }
}

/** Parse and validate raw JSON into a game pack manifest. */
export function parseGamePackManifestJson(raw: string): GamePackManifest {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new GamePackValidationError('Invalid JSON')
  }
  if (!isRecord(parsed)) {
    throw new GamePackValidationError('Game pack must be a JSON object')
  }
  if (parsed.schemaVersion !== GAME_PACK_SCHEMA_VERSION) {
    throw new GamePackValidationError(`schemaVersion must be ${GAME_PACK_SCHEMA_VERSION}`)
  }
  if (typeof parsed.id !== 'string' || !parsed.id.trim()) {
    throw new GamePackValidationError('id is required (e.g. custom/my-pack)')
  }
  if (!/^[a-z0-9][a-z0-9+/_-]*$/i.test(parsed.id)) {
    throw new GamePackValidationError('id must use letters, numbers, /, +, -, _ only')
  }
  if (typeof parsed.version !== 'number' || !Number.isInteger(parsed.version) || parsed.version < 1) {
    throw new GamePackValidationError('version must be a positive integer')
  }
  if (typeof parsed.label !== 'string' || !parsed.label.trim()) {
    throw new GamePackValidationError('label is required')
  }
  if (typeof parsed.catalogVersion !== 'number') {
    throw new GamePackValidationError('catalogVersion is required')
  }
  if (parsed.extends != null && typeof parsed.extends !== 'string') {
    throw new GamePackValidationError('extends must be a string ref or null')
  }
  if (!isRecord(parsed.structure)) {
    throw new GamePackValidationError('structure is required')
  }

  const manifest: GamePackManifest = {
    schemaVersion: GAME_PACK_SCHEMA_VERSION,
    id: parsed.id.trim(),
    version: parsed.version,
    label: parsed.label.trim(),
    catalogVersion: parsed.catalogVersion,
    extends: (parsed.extends as string | null) ?? null,
    structure: parsed.structure as GamePackManifest['structure'],
    overrides: requireOverrides(parsed.overrides),
    additions: requireAdditions(parsed.additions),
  }

  const ref = toGamePackRef(manifest)
  parseGamePackRef(ref)

  if (manifest.extends && !getGamePackManifest(manifest.extends)) {
    throw new GamePackValidationError(`extends references unknown pack: ${manifest.extends}`)
  }

  return manifest
}

/** Validate manifest and ensure resolveGamePack succeeds. */
export function assertGamePackResolvable(manifest: GamePackManifest): void {
  const ref = toGamePackRef(manifest)
  const previous = getGamePackManifest(ref)
  registerCustomPackManifest(manifest)
  try {
    resolveGamePack(ref)
  } catch (error) {
    if (previous) registerCustomPackManifest(previous)
    else unregisterCustomPackManifest(ref)
    if (error instanceof GamePackResolutionError) {
      throw new GamePackValidationError(error.message)
    }
    throw error
  }
  if (previous) registerCustomPackManifest(previous)
  else unregisterCustomPackManifest(ref)
}
