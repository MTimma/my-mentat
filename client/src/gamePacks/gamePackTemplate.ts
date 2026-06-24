import type { GamePackManifest, GamePackRef } from './types'
import { GAME_PACK_SCHEMA_VERSION } from './types'
import { expansionsForGamePack } from './resolveGamePack'

/** Draft manifest JSON (pretty-printed) forked from a parent pack with override examples. */
export function buildGamePackTemplateFromParent(parentRef: GamePackRef): string {
  const expansions = expansionsForGamePack(parentRef)
  const draft: GamePackManifest = {
    schemaVersion: GAME_PACK_SCHEMA_VERSION,
    id: 'custom/my-pack',
    version: 1,
    label: 'My custom pack',
    catalogVersion: 1,
    extends: parentRef,
    structure: {
      expansions: { ...expansions },
      playerMode: 'standard',
    },
    overrides: {
      effects: {
        'effect:board-space:14:space:0': {
          reward: { solari: 5, troops: 2, intrigueCards: 1 },
        },
        'effect:card:imperium/fremen-camp:play:0': {
          cost: { spice: 1 },
        },
      },
      cards: {
        'imperium/fremen-camp': { cost: 2 },
      },
      boardSpaces: {
        '14': { cost: { spice: 3 } },
      },
      intrigue: {
        '4': { description: 'Example — edit intrigue catalog entry fields' },
      },
      conflicts: {
        '901': {
          rewards: {
            first: [{ type: 'victoryPoints', amount: 1 }],
          },
        },
      },
    },
    additions: {
      cards: [],
      intrigue: [],
      deckPatches: {
        starting: {
          append: ['starting/power-play', 'starting/power-play', 'starting/power-play'],
        },
        imperium: {
          append: [],
          prepend: [],
        },
      },
    },
  }

  return JSON.stringify(draft, null, 2)
}
