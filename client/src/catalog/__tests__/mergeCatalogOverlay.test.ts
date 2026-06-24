import { describe, expect, it } from 'vitest'
import { mergeCatalogOverlay } from '../mergeCatalogOverlay'
import { createCatalogRuntime } from '../runtime/createCatalogRuntime'
import { resolveGamePack } from '../../gamePacks/resolveGamePack'
import boardSpacesFile from '../../../public/catalogs/board-spaces.v1.json'
import effectsFile from '../../../public/catalogs/effects.v1.json'
import cardsFile from '../../../public/catalogs/cards.v1.json'
import conflictsFile from '../../../public/catalogs/conflicts.v1.json'
import intrigueFile from '../../../public/catalogs/intrigue.v1.json'
import type {
  BoardSpacesCatalogFile,
  CardsCatalogFile,
  ConflictsCatalogFile,
  EffectsCatalogFile,
  IntrigueCatalogFile,
} from '../runtime/types'

const baseSlices = {
  effects: (effectsFile as EffectsCatalogFile).effects,
  cards: (cardsFile as CardsCatalogFile).cards,
  decks: (cardsFile as CardsCatalogFile).decks,
  boardSpaces: (boardSpacesFile as BoardSpacesCatalogFile).boardSpaces,
  conflicts: (conflictsFile as ConflictsCatalogFile).conflicts,
  intrigue: (intrigueFile as IntrigueCatalogFile).intrigue,
}

describe('mergeCatalogOverlay', () => {
  it('returns unchanged slices when no pack is provided', () => {
    const merged = mergeCatalogOverlay(baseSlices)
    expect(merged.boardSpaces.find(s => s.id === 14)?.cost).toEqual({ spice: 4 })
  })

  it('applies board space cost overrides', () => {
    const pack = resolveGamePack('official/base@1')
    const withOverride = {
      ...pack,
      overrides: {
        ...pack.overrides,
        boardSpaces: {
          '14': { cost: { spice: 3 } },
        },
      },
    }
    const merged = mergeCatalogOverlay(baseSlices, withOverride)
    expect(merged.boardSpaces.find(s => s.id === 14)?.cost).toEqual({ spice: 3 })

    const runtime = createCatalogRuntime(withOverride)
    const conspire = runtime.boardSpaces.find(s => s.id === 14)
    expect(conspire?.cost).toEqual({ spice: 3 })
  })

  it('applies starting deck patches from game pack', () => {
    const pack = resolveGamePack('official/base@1')
    const withPatch = {
      ...pack,
      additions: {
        ...pack.additions,
        deckPatches: {
          starting: {
            append: ['starting/power-play', 'starting/power-play', 'starting/power-play'],
          },
        },
      },
    }
    const merged = mergeCatalogOverlay(baseSlices, withPatch)
    const powerPlayCount = merged.decks.starting.filter(id => id === 'starting/power-play').length
    expect(powerPlayCount).toBe(4)
  })

  it('applies effect reward overrides', () => {
    const pack = resolveGamePack('official/base@1')
    const withOverride = {
      ...pack,
      overrides: {
        ...pack.overrides,
        effects: {
          'effect:board-space:14:space:0': {
            reward: { solari: 9 },
          },
        },
      },
    }
    const merged = mergeCatalogOverlay(baseSlices, withOverride)
    const effect = merged.effects.find(e => e.id === 'effect:board-space:14:space:0')
    expect(effect?.reward).toMatchObject({ solari: 9 })
    expect((effect?.reward as { troops?: number }).troops).toBe(2)
  })
})
