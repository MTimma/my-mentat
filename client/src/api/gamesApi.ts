import { parseSaveDocJson } from '../save/parseSaveDoc'
import type { SaveDoc } from '../save/types'

/** Base URL for the Rust games server (`server/src/main.rs`). Empty string uses same origin / Vite proxy. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const SESSION_FETCH: RequestInit = { credentials: 'include' }

/** GET `/games` row — metadata only; document is `GET /games/{id}`. */
export interface GameDetail {
  id: number
  owner_id: string | null
  name: string
  updated_at: string
  created_at: string
}

export interface GameAccess {
  id: number
  canEdit: boolean
}

export interface ActiveGame extends GameAccess {
  doc: SaveDoc
}

/** Load a listed row (has DB id) or import JSON (no id → insert a new row). */
export type LoadSaveFn = (doc: SaveDoc, serverGameId?: number) => void

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text()
    return text.trim() || res.statusText
  } catch {
    return res.statusText
  }
}

export function getGamesApiBaseUrl(): string {
  return API_BASE
}

export function saveGamePath(gameId?: number): string {
  const base = `${API_BASE}/games/save`
  return gameId != null ? `${base}?id=${encodeURIComponent(String(gameId))}` : base
}

function readCanEdit(body: object): boolean {
  if (!('can_edit' in body)) return true
  return (body as { can_edit: unknown }).can_edit === true
}

function saveDocFromApiBody(body: unknown): SaveDoc | null {
  if (body == null) return null
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  const parsed = parseSaveDocJson(raw)
  return parsed.ok ? parsed.doc : null
}

export async function fetchGames(): Promise<GameDetail[]> {
  const res = await fetch(`${API_BASE}/games`, SESSION_FETCH)
  if (!res.ok) {
    throw new Error(`Failed to load games (${res.status}): ${await readErrorMessage(res)}`)
  }
  return (await res.json()) as GameDetail[]
}

/** GET `/games/{id}` — full save document for a listed row. */
export async function fetchGameDoc(id: number): Promise<SaveDoc> {
  const res = await fetch(`${API_BASE}/games/${id}`, SESSION_FETCH)
  if (!res.ok) {
    throw new Error(`Failed to load game (${res.status}): ${await readErrorMessage(res)}`)
  }
  const doc = saveDocFromApiBody(await res.json())
  if (!doc) {
    throw new Error(`Game #${id}: invalid save document`)
  }
  return doc
}

/** GET `/games/active` — session cookie's current game, or null if none. */
export async function fetchActiveGame(signal?: AbortSignal): Promise<ActiveGame | null> {
  const res = await fetch(`${API_BASE}/games/active`, { ...SESSION_FETCH, signal })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Failed to load active game (${res.status}): ${await readErrorMessage(res)}`)
  }
  const body: unknown = await res.json()
  if (!body || typeof body !== 'object' || !('id' in body) || !('doc' in body)) {
    throw new Error('Active game response missing id/doc')
  }
  const id = Number((body as { id: unknown }).id)
  if (!Number.isFinite(id)) {
    throw new Error('Active game response has invalid id')
  }
  const doc = saveDocFromApiBody((body as { doc: unknown }).doc)
  if (!doc) return null
  return { id, doc, canEdit: readCanEdit(body) }
}

/** POST save document to `/games/save`; updates `gameId` when set, else the cookie's game. */
export async function saveGameJson(
  doc: SaveDoc,
  gameId?: number,
  signal?: AbortSignal
): Promise<number> {
  const res = await fetch(saveGamePath(gameId), {
    ...SESSION_FETCH,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
    signal,
  })
  if (!res.ok) {
    throw new Error(`Failed to save game (${res.status}): ${await readErrorMessage(res)}`)
  }
  return res.json() as Promise<number>
}

/** POST `/games/new` — always inserts a row and points the session cookie at it. */
export async function createGameJson(doc: SaveDoc): Promise<number> {
  const res = await fetch(`${API_BASE}/games/new`, {
    ...SESSION_FETCH,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
  if (!res.ok) {
    throw new Error(`Failed to create game (${res.status}): ${await readErrorMessage(res)}`)
  }
  return res.json() as Promise<number>
}

/** POST `/games/{id}/activate` — point the session cookie at this row, no JSON write. */
export async function activateGame(id: number): Promise<GameAccess> {
  const res = await fetch(`${API_BASE}/games/${id}/activate`, {
    ...SESSION_FETCH,
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(`Failed to open game (${res.status}): ${await readErrorMessage(res)}`)
  }
  const body: unknown = await res.json()
  if (!body || typeof body !== 'object' || !('id' in body)) {
    throw new Error('Activate response missing id')
  }
  const parsedId = Number((body as { id: unknown }).id)
  if (!Number.isFinite(parsedId)) {
    throw new Error('Activate response has invalid id')
  }
  return { id: parsedId, canEdit: readCanEdit(body) }
}

/**
 * Load a listed game by activating its row, or import JSON as a new row.
 * Never writes the loaded document onto a different game.
 */
export async function adoptLoadedGame(doc: SaveDoc, serverGameId?: number): Promise<GameAccess> {
  if (serverGameId != null) {
    return activateGame(serverGameId)
  }
  const id = await createGameJson(doc)
  return { id, canEdit: true }
}
