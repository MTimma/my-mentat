import { describe, expect, it } from 'vitest'
import { buildCatalog } from '../buildCatalog'
import {
  RISE_OF_IX_IMPERIUM_DECK,
} from '../../data/cards'
import { RISE_OF_IX_UNIQUE_CARD_COUNT } from '../../data/cardsRiseOfIx'
import { RISE_OF_IX_CONFLICTS } from '../../data/conflicts'
import { RISE_OF_IX_LEADERS } from '../../data/leaders'
import { RISE_OF_IX_INTRIGUE_CARDS } from '../../data/intrigueCards'
import { TECH_TILES } from '../../data/techTiles'

describe('buildCatalog Rise of Ix', () => {
  const catalog = buildCatalog()

  it('includes RoI imperium deck entries with riseOfIx when stubs exist', () => {
    const roiCards = catalog.cards.filter(card => card.riseOfIx && card.pool === 'imperium')
    expect(roiCards).toHaveLength(RISE_OF_IX_UNIQUE_CARD_COUNT)
    expect(catalog.expansions.byId.riseOfIx.decks.imperium).toHaveLength(
      RISE_OF_IX_IMPERIUM_DECK.length
    )
  })

  it('includes RoI conflicts, leaders, and intrigue with riseOfIx flag', () => {
    expect(catalog.conflicts.filter(c => c.riseOfIx)).toHaveLength(RISE_OF_IX_CONFLICTS.length)
    expect(catalog.leaders.filter(l => l.riseOfIx)).toHaveLength(RISE_OF_IX_LEADERS.length)
    expect(catalog.intrigue.filter(i => i.riseOfIx)).toHaveLength(RISE_OF_IX_INTRIGUE_CARDS.length)
  })

  it('publishes 18 tech tiles for Rise of Ix', () => {
    expect(catalog.techTiles).toHaveLength(18)
    expect(catalog.techTiles).toHaveLength(TECH_TILES.length)
    expect(catalog.techTiles.every(tile => tile.riseOfIx)).toBe(true)
    expect(catalog.expansions.byId.riseOfIx.counts.techTiles).toBe(18)
  })

  it('reports expansion counts in meta and byId', () => {
    const counts = catalog.expansions.byId.riseOfIx.counts
    expect(counts.boardSpaces).toBe(4)
    // Rise of Ix + Immortality are both published.
    expect(catalog.meta.counts.expansions).toBe(2)
    expect(catalog.meta.counts.techTiles).toBe(18)
  })

  it('publishes the Immortality card and intrigue pools', () => {
    const meta = catalog.expansions.byId.immortality
    expect(catalog.expansions.available).toContain('immortality')
    expect(meta.decks.imperium).toHaveLength(30)
    expect(meta.decks.tleilaxu).toHaveLength(19)
    expect(meta.decks.starting).toEqual(['starting/experimentation'])
    expect(meta.counts.intrigue).toBe(15)
    expect(catalog.intrigue.filter(i => i.immortality)).toHaveLength(15)
    expect(catalog.cards.some(c => c.id === 'starting/experimentation')).toBe(true)
  })

  it('preserves Kwisatz Haderach beforePlaceAgent recall in the effects registry', () => {
    const effect = catalog.effects.find(
      entry => entry.id === 'effect:card:imperium/kwisatz-haderach:play:0'
    )
    expect(effect?.beforePlaceAgent).toEqual({ recallAgent: true })
  })
})
