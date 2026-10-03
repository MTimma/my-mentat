import indexFile from '../../public/game-packs/index.json'
import officialBase from '../../public/game-packs/official-base.v1.json'
import officialBaseRiseOfIx from '../../public/game-packs/official-base-riseOfIx.v1.json'
import officialBaseImmortality from '../../public/game-packs/official-base-immortality.v1.json'
import officialBaseRiseOfIxImmortality from '../../public/game-packs/official-base-riseOfIx-immortality.v1.json'
import type { GamePackIndex, GamePackManifest, GamePackRef, SelectableGamePackEntry } from './types'
import { OFFICIAL_BASE_IMMORTALITY_PACK, OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK } from './constants'
import { customSelectableEntries } from './customGamePacks'

const index = indexFile as GamePackIndex

const bundledManifests = new Map<GamePackRef, GamePackManifest>([
  ['official/base@1', officialBase as GamePackManifest],
  ['official/base+riseOfIx@1', officialBaseRiseOfIx as GamePackManifest],
  ['official/base+immortality@1', officialBaseImmortality as GamePackManifest],
  ['official/base+riseOfIx+immortality@1', officialBaseRiseOfIxImmortality as GamePackManifest],
])

const customManifests = new Map<GamePackRef, GamePackManifest>()

const manifestsByRef = new Map<GamePackRef, GamePackManifest>()

function rebuildManifestIndex(): void {
  manifestsByRef.clear()
  for (const [ref, manifest] of bundledManifests) manifestsByRef.set(ref, manifest)
  for (const [ref, manifest] of customManifests) manifestsByRef.set(ref, manifest)
}

rebuildManifestIndex()

export function getGamePackIndex(): GamePackIndex {
  return index
}

/** Not listed in `game-packs/index.json`. Vite drops this branch from production builds. */
const LOCAL_DEV_IMMORTALITY_PACKS: SelectableGamePackEntry[] = [
  {
    ref: OFFICIAL_BASE_IMMORTALITY_PACK,
    label: 'Base + Immortality',
    file: 'official-base-immortality.v1.json',
  },
  {
    ref: OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK,
    label: 'Base + Rise of Ix + Immortality',
    file: 'official-base-riseOfIx-immortality.v1.json',
  },
]

export function getSelectableGamePacks(): SelectableGamePackEntry[] {
  const devPacks = import.meta.env.DEV ? LOCAL_DEV_IMMORTALITY_PACKS : []
  return [...index.selectable, ...devPacks, ...customSelectableEntries()]
}

export function getGamePackManifest(ref: GamePackRef): GamePackManifest | undefined {
  return manifestsByRef.get(ref)
}

export function getCustomPackManifests(): GamePackManifest[] {
  return [...customManifests.values()]
}

export function registerCustomPackManifest(
  manifest: GamePackManifest,
  _meta?: { source: 'localStorage' | 'repo' }
): void {
  customManifests.set(toGamePackRef(manifest), manifest)
  rebuildManifestIndex()
}

export function unregisterCustomPackManifest(ref: GamePackRef): void {
  customManifests.delete(ref)
  rebuildManifestIndex()
}

export function parseGamePackRef(ref: string): { id: string; version: number } {
  const at = ref.lastIndexOf('@')
  if (at <= 0) throw new Error(`Invalid game pack ref: ${ref}`)
  const version = Number(ref.slice(at + 1))
  if (!Number.isInteger(version) || version < 1) throw new Error(`Invalid game pack version in ref: ${ref}`)
  return { id: ref.slice(0, at), version }
}

export function toGamePackRef(manifest: Pick<GamePackManifest, 'id' | 'version'>): GamePackRef {
  return `${manifest.id}@${manifest.version}`
}
