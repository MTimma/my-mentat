import { describe, expect, it } from 'vitest'
import {
  OFFICIAL_BASE_PACK,
  OFFICIAL_BASE_RISE_OF_IX_PACK,
} from '../constants'
import { parseGamePackRef } from '../registry'
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
})
