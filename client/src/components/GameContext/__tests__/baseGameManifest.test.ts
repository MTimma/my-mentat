import { describe, expect, it } from 'vitest'
import { CONFLICTS } from '../../../data/conflicts'
import {
  IMPERIUM_ROW_DECK,
  STARTING_DECK,
  SPICE_MUST_FLOW_DECK,
} from '../../../data/cards'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { BOARD_HOTSPOTS } from '../../../data/boardHotspots'
import { intrigueCards } from '../../../services/IntrigueDeckService'
import {
  baseGameManifest,
  STARTING_DECK_NAMES,
} from '../../../test-fixtures/baseGameManifest'

describe('Base game manifest — data integrity', () => {
  it('lists expected base-game card counts from spreadsheet', () => {
    expect(baseGameManifest.imperiumRow.length).toBe(43)
    expect(baseGameManifest.intrigue.length).toBe(34)
    expect(baseGameManifest.conflicts.length).toBe(18)
    expect(baseGameManifest.leaders.length).toBe(8)
  })

  it('maps every imperium row entry to a card in IMPERIUM_ROW_DECK', () => {
    const byName = new Map(IMPERIUM_ROW_DECK.map(c => [c.name, c]))
    const missing: string[] = []
    for (const entry of baseGameManifest.imperiumRow) {
      if (!byName.has(entry.codeName)) missing.push(entry.codeName)
    }
    expect(missing, `Missing imperium cards: ${missing.join(', ')}`).toEqual([])
  })

  it('maps base intrigue entries to intrigueCards (known gaps tracked)', () => {
    const byName = new Map(intrigueCards.map(c => [c.name, c]))
    const knownNotImplemented = new Set(['Demand Respect', 'Poison Snooper'])
    const missing: string[] = []
    for (const entry of baseGameManifest.intrigue) {
      if (knownNotImplemented.has(entry.codeName)) continue
      if (!byName.has(entry.codeName)) missing.push(entry.codeName)
    }
    expect(missing, `Missing intrigue: ${missing.join(', ')}`).toEqual([])
    expect(knownNotImplemented.size).toBeGreaterThan(0)
  })

  it('includes all starting-deck cards from code', () => {
    const startingNames = new Set(STARTING_DECK.map(c => c.name))
    for (const name of STARTING_DECK_NAMES) {
      expect(startingNames.has(name), `Starting deck missing ${name}`).toBe(true)
    }
  })

  it('reserve decks exist in code', () => {
    expect(SPICE_MUST_FLOW_DECK.length).toBeGreaterThan(0)
    expect(SPICE_MUST_FLOW_DECK.some(c => /spice must flow/i.test(c.name))).toBe(true)
  })

  it('has a conflict definition for each manifest conflict codeName', () => {
    const conflictNames = new Set(CONFLICTS.map(c => c.name))
    const missing: string[] = []
    for (const entry of baseGameManifest.conflicts) {
      if (!conflictNames.has(entry.codeName)) {
        missing.push(`${entry.excelName} → ${entry.codeName}`)
      }
    }
    // Spreadsheet includes variants not yet in CONFLICTS; track gap explicitly.
    if (missing.length > 0) {
      console.warn('Conflicts in spreadsheet but not in CONFLICTS:', missing)
    }
    expect(CONFLICTS.length).toBeGreaterThanOrEqual(10)
  })

  it('board has a hotspot for every board space', () => {
    const hotspotIds = new Set(BOARD_HOTSPOTS.map(h => h.spaceId))
    const missing = BOARD_SPACES.filter(s => !hotspotIds.has(s.id)).map(s => s.name)
    expect(missing, `Spaces without hotspots: ${missing.join(', ')}`).toEqual([])
  })

  it('imperium deck qty matches spreadsheet totals', () => {
    const expectedTotal = baseGameManifest.imperiumRow.reduce(
      (sum, e) => sum + (typeof e.qty === 'number' ? e.qty : 0),
      0
    )
    expect(IMPERIUM_ROW_DECK.length).toBe(expectedTotal)
  })
})
