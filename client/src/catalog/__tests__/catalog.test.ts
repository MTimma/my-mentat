import { describe, expect, it } from 'vitest'
import { buildCatalog } from '../buildCatalog'
import { STARTING_DECK, IMPERIUM_ROW_DECK } from '../../data/cards'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { CONFLICTS } from '../../data/conflicts'
import { intrigueCards } from '../../services/IntrigueDeckService'
import { LEADERS } from '../../data/leaders'

describe('published id catalog', () => {
  const catalog = buildCatalog()

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

  it('board spaces, conflicts, intrigue and leaders are complete with unique ids', () => {
    expect(catalog.boardSpaces).toHaveLength(BOARD_SPACES.length)
    expect(new Set(catalog.boardSpaces.map(s => s.id)).size).toBe(BOARD_SPACES.length)

    expect(catalog.conflicts).toHaveLength(CONFLICTS.length)
    expect(new Set(catalog.conflicts.map(c => c.id)).size).toBe(CONFLICTS.length)

    expect(catalog.intrigue).toHaveLength(intrigueCards.length)
    expect(new Set(catalog.intrigue.map(i => i.id)).size).toBe(intrigueCards.length)

    expect(catalog.leaders).toHaveLength(LEADERS.length)
    expect(new Set(catalog.leaders.map(l => l.id)).size).toBe(LEADERS.length)
  })

  it('publishes the choice-id grammar', () => {
    expect(catalog.choiceIdGrammar.format).toContain('<sourceType>-<sourceId>-<kind>')
    expect(catalog.choiceIdGrammar.kinds).toContain('OR')
    expect(catalog.choiceIdGrammar.kinds).toContain('CARD-SELECT')
    expect(catalog.choiceIdGrammar.examples.length).toBeGreaterThan(0)
  })
})
