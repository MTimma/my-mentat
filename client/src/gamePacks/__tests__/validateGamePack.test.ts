import { describe, expect, it } from 'vitest'
import { OFFICIAL_BASE_PACK } from '../constants'
import { buildGamePackTemplateFromParent } from '../gamePackTemplate'
import { parseGamePackManifestJson, assertGamePackResolvable } from '../validateGamePack'
import { saveCustomGamePack } from '../customGamePacks'
import { getGamePackManifest } from '../registry'
import { toGamePackRef } from '../registry'

describe('validateGamePack', () => {
  it('parses template forked from official base', () => {
    const raw = buildGamePackTemplateFromParent(OFFICIAL_BASE_PACK)
    const manifest = parseGamePackManifestJson(raw)
    expect(manifest.extends).toBe(OFFICIAL_BASE_PACK)
    assertGamePackResolvable(manifest)
  })

  it('resolves pack JSON missing overrides (empty object normalized)', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      id: 'custom/my-pack',
      version: 1,
      label: 'My custom pack',
      catalogVersion: 1,
      extends: 'official/base+riseOfIx@1',
      structure: {
        expansions: { riseOfIx: true, riseOfIxEpic: false },
        playerMode: 'standard',
      },
      effects: {},
      additions: {
        cards: [],
        intrigue: [],
        deckPatches: {
          starting: {
            append: ['starting/power-play', 'starting/power-play', 'starting/power-play'],
          },
        },
      },
    })
    const manifest = parseGamePackManifestJson(raw)
    expect(manifest.overrides).toEqual({
      effects: {},
      cards: {},
      boardSpaces: {},
      intrigue: {},
      conflicts: {},
    })
    assertGamePackResolvable(manifest)
  })

  it('registers custom pack after save', () => {
    const raw = buildGamePackTemplateFromParent(OFFICIAL_BASE_PACK)
    const manifest = parseGamePackManifestJson(
      raw.replace('"custom/my-pack"', '"custom/test-validate-pack"')
    )
    const ref = saveCustomGamePack(manifest)
    expect(getGamePackManifest(ref)?.label).toBe(manifest.label)
    expect(toGamePackRef(manifest)).toBe(ref)
  })
})
