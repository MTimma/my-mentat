import { describe, expect, it } from 'vitest'
import { OFFICIAL_BASE_RISE_OF_IX_PACK } from '../../gamePacks/constants'
import { registerCustomPackManifest } from '../../gamePacks/registry'
import { resolveGamePack } from '../../gamePacks/resolveGamePack'
import { buildStartingDeck } from '../starterDeckSetup'

describe('buildStartingDeck game packs', () => {
  it('includes extra power play copies from deckPatches', () => {
    const manifest = {
      ...resolveGamePack(OFFICIAL_BASE_RISE_OF_IX_PACK),
      id: 'custom/test-power-play-pack',
      version: 1,
      label: 'Test',
      extends: OFFICIAL_BASE_RISE_OF_IX_PACK,
      additions: {
        cards: [],
        intrigue: [],
        deckPatches: {
          starting: {
            append: ['imperium/power-play', 'imperium/power-play', 'imperium/power-play'],
          },
        },
      },
    }
    registerCustomPackManifest(manifest)

    const deck = buildStartingDeck('custom/test-power-play-pack@1')
    const powerPlays = deck.filter(card => card.name === 'Power Play')
    expect(powerPlays).toHaveLength(3)
  })
})
