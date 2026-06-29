import { describe, expect, it } from 'vitest'
import { buildCatalog, CATALOG_SCHEMA_VERSION, slugify } from '../buildCatalog'
import { STARTING_DECK, IMPERIUM_ROW_DECK, RISE_OF_IX_IMPERIUM_DECK } from '../../data/cards'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { CONFLICTS, RISE_OF_IX_CONFLICTS } from '../../data/conflicts'
import { intrigueCards } from '../../data/intrigueCards'
import { RISE_OF_IX_INTRIGUE_CARDS } from '../../data/intrigueCards'
import { IMMORTALITY_INTRIGUE_CARDS } from '../../data/intrigueCardsImmortality'
import { LEADERS, RISE_OF_IX_LEADERS } from '../../data/leaders'
import { TECH_TILES } from '../../data/techTiles'

describe('published id catalog', () => {
  const catalog = buildCatalog()

  it('uses schema version 1 with expansion metadata', () => {
    expect(catalog.schemaVersion).toBe(1)
    expect(CATALOG_SCHEMA_VERSION).toBe(1)
    expect(catalog.expansions.available).toContain('riseOfIx')
    expect(catalog.expansions.byId.riseOfIx.decks.imperium).toEqual(
      RISE_OF_IX_IMPERIUM_DECK.map(card => `imperium/${slugify(card.name)}`)
    )
  })

  it('is JSON round-trippable and deterministic', () => {
    const a = JSON.stringify(buildCatalog())
    const b = JSON.stringify(buildCatalog())
    expect(a).toBe(b)
    expect(JSON.parse(a)).toEqual(catalog)
  })

  it('has unique catalog card ids (pool/slug) and covers all pools', () => {
    const ids = catalog.cards.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^(starting|imperium|arrakis-liaison|spice-must-flow|foldspace)\/[a-z0-9-]+$/)
    }
    const pools = new Set(catalog.cards.map(c => c.pool))
    expect(pools).toEqual(
      new Set(['starting', 'imperium', 'arrakis-liaison', 'spice-must-flow', 'foldspace'])
    )
  })

  it('deck compositions resolve to catalog entries (incl. duplicate copies)', () => {
    const cardIds = new Set(catalog.cards.map(c => c.id))
    for (const deck of Object.values(catalog.decks)) {
      for (const id of deck) expect(cardIds.has(id)).toBe(true)
    }
    expect(catalog.decks.starting).toHaveLength(STARTING_DECK.length)
    expect(catalog.decks.imperium).toHaveLength(IMPERIUM_ROW_DECK.length)
  })

  it('base imperium deck has official copy counts for key cards', () => {
    const count = (name: string) => IMPERIUM_ROW_DECK.filter(c => c.name === name).length
    expect(count('Power Play')).toBe(3)
    expect(count('Fremen Camp')).toBe(2)
    expect(count('The Voice')).toBe(2)
    expect(count('Shifting Allegiances')).toBe(2)
    expect(count('Scout')).toBe(2)
  })

  // NOTE: authored numeric ids in cards.ts are NOT unique across (or even
  // within) pools — e.g. 1036 is "Other Memory" (starting) and "Missionaria
  // Protectiva" (imperium); 1026 is shared by three imperium cards. This is
  // tolerated at runtime because imperium instances are re-id'd via
  // buildImperiumDeck. The catalog's own ids must not inherit that ambiguity.
  it('keeps raw author ids available per entry without relying on their uniqueness', () => {
    for (const card of catalog.cards) {
      expect(card.authorIds.length).toBeGreaterThan(0)
    }
  })

  it('separates rewards into the effects registry: entries only reference effect ids', () => {
    const registryIds = new Set(catalog.effects.map(e => e.id))
    expect(registryIds.size).toBe(catalog.effects.length) // unique

    for (const card of catalog.cards) {
      for (const slot of ['play', 'reveal', 'trash'] as const) {
        for (const effectId of card.effects[slot] ?? []) {
          expect(registryIds.has(effectId)).toBe(true)
        }
      }
      if (card.effects.acquire) expect(registryIds.has(card.effects.acquire)).toBe(true)
      // No embedded reward objects on the card entry itself
      expect(card).not.toHaveProperty('playEffect')
      expect(card).not.toHaveProperty('revealEffect')
    }
    for (const space of catalog.boardSpaces) {
      for (const effectId of space.effects) expect(registryIds.has(effectId)).toBe(true)
    }
    for (const entry of catalog.intrigue) {
      for (const effectId of entry.effects.play ?? []) {
        expect(registryIds.has(effectId)).toBe(true)
      }
    }
  })

  it('every effect registry entry carries a reward and a resolvable owner', () => {
    const cardIds = new Set(catalog.cards.map(c => c.id))
    const spaceIds = new Set(catalog.boardSpaces.map(s => s.id))
    const intrigueIds = new Set(catalog.intrigue.map(i => i.id))
    for (const effect of catalog.effects) {
      expect(effect.reward).toBeDefined()
      if (effect.owner.type === 'card') expect(cardIds.has(effect.owner.id as string)).toBe(true)
      if (effect.owner.type === 'board-space') expect(spaceIds.has(effect.owner.id as number)).toBe(true)
      if (effect.owner.type === 'intrigue') expect(intrigueIds.has(effect.owner.id as number)).toBe(true)
    }
  })

  it('board spaces, conflicts, intrigue, leaders and tech tiles are complete with unique ids', () => {
    expect(catalog.boardSpaces).toHaveLength(BOARD_SPACES.length)
    expect(new Set(catalog.boardSpaces.map(s => s.id)).size).toBe(BOARD_SPACES.length)

    expect(catalog.conflicts).toHaveLength(CONFLICTS.length + RISE_OF_IX_CONFLICTS.length)
    expect(new Set(catalog.conflicts.map(c => c.id)).size).toBe(
      CONFLICTS.length + RISE_OF_IX_CONFLICTS.length
    )

    const totalIntrigue =
      intrigueCards.length + RISE_OF_IX_INTRIGUE_CARDS.length + IMMORTALITY_INTRIGUE_CARDS.length
    expect(catalog.intrigue).toHaveLength(totalIntrigue)
    expect(new Set(catalog.intrigue.map(i => i.id)).size).toBe(totalIntrigue)

    expect(catalog.leaders).toHaveLength(LEADERS.length + RISE_OF_IX_LEADERS.length)
    expect(new Set(catalog.leaders.map(l => l.id)).size).toBe(
      LEADERS.length + RISE_OF_IX_LEADERS.length
    )

    expect(catalog.techTiles).toHaveLength(TECH_TILES.length)
    expect(catalog.meta.counts.techTiles).toBe(18)
  })

  it('flags Rise of Ix board spaces 23–26', () => {
    const roiSpaces = catalog.boardSpaces.filter(space => space.riseOfIx)
    expect(roiSpaces.map(s => s.id).sort()).toEqual([23, 24, 25, 26])
  })

  it('publishes the choice-id grammar', () => {
    expect(catalog.choiceIdGrammar.format).toContain('<sourceType>-<sourceId>-<kind>')
    expect(catalog.choiceIdGrammar.kinds).toContain('OR')
    expect(catalog.choiceIdGrammar.kinds).toContain('CARD-SELECT')
    expect(catalog.choiceIdGrammar.examples.length).toBeGreaterThan(0)
  })
})
