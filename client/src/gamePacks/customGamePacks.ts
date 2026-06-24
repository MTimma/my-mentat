import type { GamePackManifest, GamePackRef, SelectableGamePackEntry } from './types'
import { toGamePackRef } from './registry'
import { getCustomPackManifests, registerCustomPackManifest, unregisterCustomPackManifest } from './registry'

export const CUSTOM_GAME_PACKS_STORAGE_KEY = 'myMentat.customGamePacks'

type StoredCustomPacks = { schemaVersion: 1; manifests: GamePackManifest[] }
const packListeners = new Set<() => void>()
let memoryStorage: StoredCustomPacks | null = null

function storageAvailable(): boolean {
  return typeof localStorage !== 'undefined'
}

export function subscribeGamePacks(listener: () => void): () => void {
  packListeners.add(listener)
  return () => packListeners.delete(listener)
}

function notifyGamePackListeners(): void {
  packListeners.forEach(listener => listener())
}

function readStorage(): StoredCustomPacks {
  if (!storageAvailable()) {
    return memoryStorage ?? { schemaVersion: 1, manifests: [] }
  }
  try {
    const raw = localStorage.getItem(CUSTOM_GAME_PACKS_STORAGE_KEY)
    if (!raw) return { schemaVersion: 1, manifests: [] }
    const parsed = JSON.parse(raw) as StoredCustomPacks
    return { schemaVersion: 1, manifests: Array.isArray(parsed.manifests) ? parsed.manifests : [] }
  } catch {
    return { schemaVersion: 1, manifests: [] }
  }
}

function writeStorage(manifests: GamePackManifest[]): void {
  const payload: StoredCustomPacks = { schemaVersion: 1, manifests }
  if (!storageAvailable()) {
    memoryStorage = payload
    return
  }
  localStorage.setItem(CUSTOM_GAME_PACKS_STORAGE_KEY, JSON.stringify(payload))
}

export function hydrateCustomGamePacksFromStorage(): void {
  for (const manifest of readStorage().manifests) {
    registerCustomPackManifest(manifest, { source: 'localStorage' })
  }
}

export function saveCustomGamePack(manifest: GamePackManifest): GamePackRef {
  const ref = toGamePackRef(manifest)
  const next = readStorage().manifests.filter(m => toGamePackRef(m) !== ref)
  next.push(manifest)
  writeStorage(next)
  registerCustomPackManifest(manifest, { source: 'localStorage' })
  notifyGamePackListeners()
  return ref
}

export function deleteCustomGamePack(ref: GamePackRef): void {
  writeStorage(readStorage().manifests.filter(m => toGamePackRef(m) !== ref))
  unregisterCustomPackManifest(ref)
  notifyGamePackListeners()
}

export async function hydrateCustomGamePacksFromRepo(): Promise<void> {
  try {
    const indexRes = await fetch('/game-packs/custom/index.json', { cache: 'no-cache' })
    if (!indexRes.ok) return
    const index = (await indexRes.json()) as { packs?: Array<{ file: string }> }
    for (const entry of index.packs ?? []) {
      const fileRes = await fetch(`/game-packs/custom/${entry.file}`, { cache: 'no-cache' })
      if (!fileRes.ok) continue
      registerCustomPackManifest((await fileRes.json()) as GamePackManifest, { source: 'repo' })
    }
    notifyGamePackListeners()
  } catch { /* ignore */ }
}

export function customPackFilename(manifest: GamePackManifest): string {
  return `${manifest.id.split('/').pop() ?? 'pack'}.v${manifest.version}.json`
}

export function downloadGamePackJson(manifest: GamePackManifest): void {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = customPackFilename(manifest)
  a.click()
  URL.revokeObjectURL(url)
}

export async function saveCustomGamePackToRepo(manifest: GamePackManifest): Promise<void> {
  if (!import.meta.env.DEV) throw new Error('Repo save is only available in dev mode')
  const res = await fetch('/api/dev/save-game-pack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manifest }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export function customSelectableEntries(): SelectableGamePackEntry[] {
  return getCustomPackManifests().map(manifest => ({
    ref: toGamePackRef(manifest),
    label: manifest.label,
    file: `custom/${customPackFilename(manifest)}`,
  }))
}
