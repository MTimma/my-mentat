import type { SetupBlock } from '../save/types'
import {
  DEFAULT_GAME_PACK_ID,
  GAME_PACK_STORAGE_KEY,
  OFFICIAL_BASE_IMMORTALITY_PACK,
  OFFICIAL_BASE_PACK,
  OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK,
  OFFICIAL_BASE_RISE_OF_IX_PACK,
} from './constants'
import { getGamePackManifest } from './registry'
import type { GamePackRef } from './types'

/** Infer game pack ref from legacy setup fields when gamePackId is absent. */
export function inferGamePackId(setup: Pick<SetupBlock, 'gamePackId' | 'expansions'>): GamePackRef {
  if (setup.gamePackId) {
    return setup.gamePackId
  }
  const riseOfIx = setup.expansions?.riseOfIx
  const immortality = setup.expansions?.immortality
  if (riseOfIx && immortality) {
    return OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK
  }
  if (immortality) {
    return OFFICIAL_BASE_IMMORTALITY_PACK
  }
  if (riseOfIx) {
    return OFFICIAL_BASE_RISE_OF_IX_PACK
  }
  return OFFICIAL_BASE_PACK
}

/** Ensure setup has a gamePackId (mutates a shallow copy). */
export function normalizeSetupGamePack(setup: SetupBlock): SetupBlock {
  const gamePackId = inferGamePackId(setup)
  return {
    ...setup,
    gamePackId,
  }
}

/** Read persisted game pack selection (migrates legacy Rise of Ix checkbox). */
export function loadStoredGamePackId(): GamePackRef {
  const stored = localStorage.getItem(GAME_PACK_STORAGE_KEY)
  if (stored) return stored
  const legacyRiseOfIx = localStorage.getItem('myMentat.riseOfIx')
  if (legacyRiseOfIx === 'true') return OFFICIAL_BASE_RISE_OF_IX_PACK
  return DEFAULT_GAME_PACK_ID
}

/** Like loadStoredGamePackId, but falls back when the stored ref is not registered. */
export function resolveStoredGamePackId(): GamePackRef {
  const stored = loadStoredGamePackId()
  return getGamePackManifest(stored) ? stored : DEFAULT_GAME_PACK_ID
}
