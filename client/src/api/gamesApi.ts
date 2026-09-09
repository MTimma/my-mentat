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

export interface FetchedGame {
  id: number
  doc: SaveDoc
  canEdit: boolean
}

/** Where a loaded SaveDoc came from (Browse / file import). */
export type LoadSaveSource = {
  serverGameId?: number
  localGameId?: string
  /** From GET `/games/{id}` `can_edit` — false for other owners / anonymous. */
  canEdit?: boolean
}

/** Load a listed row, local draft, or import JSON. */
export type LoadSaveFn = (doc: SaveDoc, source?: LoadSaveSource) => void

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

function saveDocFromApiBody(body: unknown): SaveDoc | null {
  if (body == null) return null
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  const parsed = parseSaveDocJson(raw)
  return parsed.ok ? parsed.doc : null
}

function readCanEdit(body: object): boolean {
  if (!('can_edit' in body)) return false
  return (body as { can_edit: unknown }).can_edit === true
}

let gamesListCache: GameDetail[] | null = null
let gamesListInflight: Promise<GameDetail[]> | null = null

async function fetchGamesFromNetwork(): Promise<GameDetail[]> {
  const res = await fetch(`${API_BASE}/games`, SESSION_FETCH)
  if (!res.ok) {
    throw new Error(`Failed to load games (${res.status}): ${await readErrorMessage(res)}`)
  }
  return (await res.json()) as GameDetail[]
}

/** Warm community list before Browse opens (deduped in-flight). */
export function prefetchGamesList(): void {
  if (gamesListCache || gamesListInflight) return
  gamesListInflight = fetchGamesFromNetwork()
    .then(rows => {
      gamesListCache = rows
      return rows
    })
    .catch(() => {
      gamesListCache = null
      return [] as GameDetail[]
    })
    .finally(() => {
      gamesListInflight = null
    })
}

export function getCachedGamesList(): GameDetail[] | null {
  return gamesListCache
}

export function invalidateGamesListCache(): void {
  gamesListCache = null
  gamesListInflight = null
}

export async function fetchGames(opts?: { fresh?: boolean }): Promise<GameDetail[]> {
  if (!opts?.fresh && gamesListCache) return gamesListCache
  if (!opts?.fresh && gamesListInflight) return gamesListInflight

  const promise = fetchGamesFromNetwork().then(rows => {
    gamesListCache = rows
    return rows
  })
  gamesListInflight = promise
  try {
    return await promise
  } finally {
    if (gamesListInflight === promise) gamesListInflight = null
  }
}

/** GET `/games/{id}` — save document + whether this session may edit it. */
export async function fetchGameDoc(id: number): Promise<FetchedGame> {
  const res = await fetch(`${API_BASE}/games/${id}`, SESSION_FETCH)
  if (!res.ok) {
    throw new Error(`Failed to load game (${res.status}): ${await readErrorMessage(res)}`)
  }
  const body: unknown = await res.json()
  // New shape: { id, doc, can_edit }. Legacy: bare JSON string / SaveDoc.
  if (body && typeof body === 'object' && 'doc' in body) {
    const doc = saveDocFromApiBody((body as { doc: unknown }).doc)
    if (!doc) {
      throw new Error(`Game #${id}: invalid save document`)
    }
    const parsedId = Number((body as { id?: unknown }).id)
    return {
      id: Number.isFinite(parsedId) ? parsedId : id,
      doc,
      canEdit: readCanEdit(body),
    }
  }
  const doc = saveDocFromApiBody(body)
  if (!doc) {
    throw new Error(`Game #${id}: invalid save document`)
  }
  return { id, doc, canEdit: false }
}
