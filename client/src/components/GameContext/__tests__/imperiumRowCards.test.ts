import { describe, it } from 'vitest'
import { IMPERIUM_ROW_DECK } from '../../../data/cards'
import { baseGameManifest } from '../../../test-fixtures/baseGameManifest'

/**
 * One stub per base-game imperium row card (spreadsheet filter: 1. base).
 * Implement by copying patterns from intrigueCards.test.ts:
 *   PLAY_CARD → PLACE_AGENT (matching agent icon) → assert resources / gains.
 *
 * Agent: mark implemented tests by replacing it.todo with it(...).
 */
describe('Imperium row cards — base game', () => {
  const byName = new Map(IMPERIUM_ROW_DECK.map(c => [c.name, c]))

  for (const entry of baseGameManifest.imperiumRow) {
    const card = byName.get(entry.codeName)
    const label = `${entry.codeName} (cost ${entry.cost}, qty ${entry.qty})`

    it.todo(`${label}: agent box — ${entry.agentBox || 'see card data'}`)
    it.todo(`${label}: reveal — persuasion ${entry.revealPersuasion}, swords ${entry.revealSwords}`)
  }
})

describe('Imperium row cards — acquire effects', () => {
  it.todo('Chani: acquire gives +1 water')
  it.todo('Crysknife: trash trigger +4 Solari')
  it.todo('Shifting Allegiances: infiltrate / graft behavior')
})
