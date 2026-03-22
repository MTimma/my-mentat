import { describe, expect, it } from 'vitest'
import type { Card } from '../../types/GameTypes'
import {
  IMPERIUM_ROW_DECK,
  STARTING_DECK,
  buildImperiumDeck,
} from '../../data/cards'
import { buildSetupImperiumDeck } from '../starterDeckSetup'

/** Mirrors production logic for property tests (name-based removal in deck order). */
function referenceRemainingDeck(playerDecks: Card[][], fullDeck: Card[]): Card[] {
  const reservedByName = playerDecks.flat().reduce<Map<string, number>>((counts, card) => {
    counts.set(card.name, (counts.get(card.name) || 0) + 1)
    return counts
  }, new Map())

  return fullDeck.filter(card => {
    const reservedCount = reservedByName.get(card.name) || 0
    if (reservedCount === 0) {
      return true
    }
    reservedByName.set(card.name, reservedCount - 1)
    return false
  })
}

describe('buildSetupImperiumDeck', () => {
  it('matches reference implementation for varied player-deck shapes', () => {
    const full = buildImperiumDeck(10_000)
    const convincingOnly = {
      id: 1,
      name: 'Convincing Argument',
      image: 'starter_deck/convincing_argument.avif',
      agentIcons: [],
    } as Card

    const cases: Card[][][] = [
      [],
      [[]],
      [STARTING_DECK],
      [STARTING_DECK, STARTING_DECK],
      [full.slice(0, 5)],
      [[convincingOnly]],
    ]

    for (const playerDecks of cases) {
      const a = buildSetupImperiumDeck(playerDecks)
      const b = referenceRemainingDeck(playerDecks, full)
      expect(a.map(c => c.name)).toEqual(b.map(c => c.name))
    }
  })

  it('with no player decks, yields the full shuffled Imperium deck order (cloned ids)', () => {
    const full = buildImperiumDeck()
    const setup = buildSetupImperiumDeck([])
    expect(setup.map(c => c.name)).toEqual(full.map(c => c.name))
    expect(new Set(setup.map(c => c.id)).size).toBe(setup.length)
  })

  it('removes default starter cards that exist in the Imperium deck (67 → 57 for one player)', () => {
    const overlap = STARTING_DECK.filter(c =>
      IMPERIUM_ROW_DECK.some(ic => ic.name === c.name)
    )
    expect(overlap.length).toBe(10)

    const setup = buildSetupImperiumDeck([STARTING_DECK])
    expect(setup.length).toBe(IMPERIUM_ROW_DECK.length - overlap.length)
  })

  it('aggregates reservations across multiple players', () => {
    const twoPlayers = [STARTING_DECK, STARTING_DECK]
    const setup = buildSetupImperiumDeck(twoPlayers)
    const ref = referenceRemainingDeck(twoPlayers, buildImperiumDeck())
    expect(setup.map(c => c.name)).toEqual(ref.map(c => c.name))
  })
})

describe('IMPERIUM_ROW_DECK (base game regression)', () => {
  it('has 67 cards, matching the base-game Imperium deck size', () => {
    expect(IMPERIUM_ROW_DECK.length).toBe(67)
  })

  it('buildImperiumDeck produces one entry per source card with unique ids', () => {
    const built = buildImperiumDeck()
    expect(built.length).toBe(IMPERIUM_ROW_DECK.length)
    const ids = new Set(built.map(c => c.id))
    expect(ids.size).toBe(built.length)
  })
})
