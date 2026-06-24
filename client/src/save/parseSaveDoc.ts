import { SAVE_SCHEMA_VERSION, type SaveDoc } from './types'
import { normalizeSetupGamePack } from '../gamePacks/inferGamePack'

export type ParseSaveDocResult =
  | { ok: true; doc: SaveDoc }
  | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/** Parse and validate pasted/exported SaveDoc JSON (rejects runtime dumps). */
export function parseSaveDocJson(raw: string): ParseSaveDocResult {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, error: 'Paste exported game' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'Save document must be a JSON object' }
  }

  if (!('setup' in parsed) || !('events' in parsed)) {
    if ('players' in parsed && 'phase' in parsed) {
      return {
        ok: false,
        error:
          'This looks like a runtime state dump. Export from Turn History → Save document tab instead.',
      }
    }
    return { ok: false, error: 'Missing setup or events — not a Save document' }
  }

  if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schemaVersion (expected ${SAVE_SCHEMA_VERSION})`,
    }
  }

  if (!isRecord(parsed.setup)) {
    return { ok: false, error: 'Missing setup block' }
  }

  const players = parsed.setup.players
  if (!Array.isArray(players) || players.length === 0) {
    return { ok: false, error: 'setup.players must be a non-empty array' }
  }

  if (!Array.isArray(parsed.events)) {
    return {
      ok: false,
      error: 'Missing events array — use Save document export, not Runtime state',
    }
  }

  if (!isRecord(parsed.meta)) {
    return { ok: false, error: 'Missing meta block' }
  }

  if (!Array.isArray(parsed.branches)) {
    return { ok: false, error: 'Missing branches array' }
  }

  if (!isRecord(parsed.cursor)) {
    return { ok: false, error: 'Missing cursor block' }
  }

  const doc = parsed as SaveDoc
  doc.setup = normalizeSetupGamePack(doc.setup)

  return { ok: true, doc }
}
