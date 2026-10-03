import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  OFFICIAL_BASE_IMMORTALITY_PACK,
  OFFICIAL_BASE_PACK,
  OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK,
  OFFICIAL_BASE_RISE_OF_IX_PACK,
} from '../constants'
import { getSelectableGamePacks, parseGamePackRef } from '../registry'
import { resolveGamePack, GamePackResolutionError } from '../resolveGamePack'

describe('resolveGamePack', () => {
  it('parses id@version refs', () => {
    expect(parseGamePackRef('official/base@1')).toEqual({ id: 'official/base', version: 1 })
    expect(parseGamePackRef('official/base+riseOfIx@1')).toEqual({
      id: 'official/base+riseOfIx',
      version: 1,
    })
  })

  it('resolves official/base@1', () => {
    const pack = resolveGamePack(OFFICIAL_BASE_PACK)
    expect(pack.ref).toBe(OFFICIAL_BASE_PACK)
    expect(pack.structure.expansions.riseOfIx).toBe(false)
    expect(pack.catalogVersion).toBe(1)
  })

  it('resolves official/base+riseOfIx@1 via extends chain', () => {
    const pack = resolveGamePack(OFFICIAL_BASE_RISE_OF_IX_PACK)
    expect(pack.structure.expansions.riseOfIx).toBe(true)
    expect(pack.structure.expansions.riseOfIxEpic).toBe(false)
    expect(pack.label).toBe('Base + Rise of Ix')
  })

  it('throws for unknown pack ref', () => {
    expect(() => resolveGamePack('official/nope@1')).toThrow(GamePackResolutionError)
  })

  it('offers immortality packs in the expansions list only during local dev', () => {
    const index = JSON.parse(
      readFileSync(resolve(__dirname, '../../../public/game-packs/index.json'), 'utf8')
    ) as { selectable: Array<{ ref: string }> }
    const published = index.selectable.map(entry => entry.ref)
    expect(published).not.toContain(OFFICIAL_BASE_IMMORTALITY_PACK)
    expect(published).not.toContain(OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK)

    const refs = getSelectableGamePacks().map(pack => pack.ref)
    if (import.meta.env.DEV) {
      expect(refs).toContain(OFFICIAL_BASE_IMMORTALITY_PACK)
      expect(refs).toContain(OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK)
    } else {
      expect(refs).not.toContain(OFFICIAL_BASE_IMMORTALITY_PACK)
      expect(refs).not.toContain(OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK)
    }
  })
})
