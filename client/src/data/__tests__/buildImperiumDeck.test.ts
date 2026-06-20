import { describe, expect, it } from 'vitest'
import { buildImperiumDeck as buildLegacyImperiumDeck, RISE_OF_IX_IMPERIUM_DECK } from '../cards'
import { buildImperiumDeck as buildCatalogImperiumDeck } from '../../catalog/runtime'
import { NO_EXPANSIONS } from '../../types/GameTypes'

describe('buildImperiumDeck', () => {
  const baseLength = buildCatalogImperiumDeck(NO_EXPANSIONS).length

  it('buildImperiumDeck(NO_EXPANSIONS) length matches base catalog pool', () => {
    expect(buildCatalogImperiumDeck(NO_EXPANSIONS)).toHaveLength(baseLength)
    expect(buildLegacyImperiumDeck(2000, NO_EXPANSIONS).length).toBeGreaterThan(0)
  })

  it('buildImperiumDeck({ riseOfIx: true }) length === base length + 35', () => {
    const roiOn = buildCatalogImperiumDeck({ riseOfIx: true, riseOfIxEpic: false })
    expect(roiOn).toHaveLength(baseLength + 35)
  })

  it('buildImperiumDeck({ riseOfIx: true }) contains an "Appropriate" card', () => {
    const roiOn = buildCatalogImperiumDeck({ riseOfIx: true, riseOfIxEpic: false })
    expect(roiOn.some(c => c.name === 'Appropriate')).toBe(true)
  })

  it('ids are unique across the returned deck', () => {
    const deck = buildCatalogImperiumDeck(NO_EXPANSIONS)
    const ids = deck.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('with riseOfIx on, length includes RoI stub deck size', () => {
    const roiOn = buildCatalogImperiumDeck({ riseOfIx: true, riseOfIxEpic: false })
    expect(roiOn).toHaveLength(baseLength + RISE_OF_IX_IMPERIUM_DECK.length)
  })
})
