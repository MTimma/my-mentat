import type { SaveDoc } from '../save/types'

/** Base URL for the Rust games server (`server/src/main.rs`). Empty string uses same origin / Vite proxy. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export interface GameListItem {
  id: number
  owner_id: string | null
  name: string
  json: string
  updated_at: string
  created_at: string
}

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

export async function fetchGames(): Promise<GameListItem[]> {
  const res = await fetch(`${API_BASE}/games`)
  if (!res.ok) {
    throw new Error(`Failed to load games (${res.status}): ${await readErrorMessage(res)}`)
  }
  return (await res.json()) as GameListItem[]
}

/** POST save document to `/games/save`; returns the new row id. */
export async function saveGameJson(doc: SaveDoc): Promise<number> {
  const res = await fetch(`${API_BASE}/games/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
  if (!res.ok) {
    throw new Error(`Failed to save game (${res.status}): ${await readErrorMessage(res)}`)
  }
  return res.json() as Promise<number>
}
