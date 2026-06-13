/**
 * Create an empty game-input / save document (setup + no events yet).
 * Used when starting a new game from the setup UI.
 */
import { SAVE_SCHEMA_VERSION, type SaveDoc, type SaveMeta, type SetupBlock } from './types'

export interface CreateGameInputOptions {
  id?: string
  title?: string
  notes?: string
  now?: () => string
}

export function createGameInputDoc(
  setup: SetupBlock,
  options: CreateGameInputOptions = {}
): SaveDoc {
  const now = (options.now ?? (() => new Date().toISOString()))()
  const meta: SaveMeta = {
    id: options.id ?? `game-${now}`,
    title: options.title ?? 'New game',
    createdAt: now,
    updatedAt: now,
    ...(options.notes ? { notes: options.notes } : {}),
  }
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    meta,
    setup: JSON.parse(JSON.stringify(setup)),
    events: [],
    branches: [],
    cursor: { branch: 'trunk', event: 0 },
  }
}
