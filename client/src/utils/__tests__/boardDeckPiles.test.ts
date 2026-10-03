import { describe, expect, it } from 'vitest'
import { CONFLICTS } from '../../data/conflicts'
import { TechTileId } from '../../data/techTiles'
import { NO_EXPANSIONS, type Card, type GameState, type IntrigueCard } from '../../types/GameTypes'
import { listBoardDeckPiles } from '../boardDeckPiles'

function card(id: number, name = `Card ${id}`): Card {
  return { id, name, image: `/cards/${id}.png`, agentIcons: [] }
}

function intrigue(id: number, name = `Intrigue ${id}`): IntrigueCard {
  return { ...card(id, name), agentIcons: [], type: 'combat' as IntrigueCard['type'], description: '' }
}

function state(partial: Partial<GameState> = {}): GameState {
  return {
    expansions: NO_EXPANSIONS,
    imperiumRow: [],
    imperiumRowDeck: [],
    imperiumRowDiscard: [],
    intrigueDeck: [],
    intrigueDiscard: [],
    conflictsDiscard: [],
    currentConflict: {
      id: 0,
      tier: 1,
      name: 'Placeholder',
      rewards: { first: [], second: [], third: [] },
    },
    players: [],
    helenaRemovedCard: null,
    ...partial,
  } as GameState
}

describe('listBoardDeckPiles', () => {
  it('keeps the imperium deck free of the row, acquired cards, and Helena’s set-aside card', () => {
    const row = card(2001, 'On row')
    const acquired = card(2002, 'Bought')
    const helena = card(2003, 'Set aside')
    const atomics = card(2004, 'Atomics')
    const deckCard = card(2005, 'Still in deck')
    const piles = listBoardDeckPiles(
      state({
        imperiumRow: [row],
        imperiumRowDeck: [deckCard, row, acquired, helena],
        imperiumRowDiscard: [atomics],
        helenaRemovedCard: { cardId: helena.id, playerId: 0, card: helena },
        players: [{ discardPile: [acquired] } as GameState['players'][number]],
      })
    )

    const deck = piles.find(item => item.id === 'imperium-deck')
    const discard = piles.find(item => item.id === 'imperium-discard')
    expect(deck?.cards.map(face => face.name)).toEqual(['Still in deck'])
    expect(discard?.cards.map(face => face.name)).toEqual(['Set aside', 'Atomics'])
    expect(discard?.cards[0]?.note).toBe('Helena — not acquired')
  })

  it('shows intrigue top-first and played cards in the discard', () => {
    const piles = listBoardDeckPiles(
      state({
        intrigueDeck: [intrigue(1, 'Bottom'), intrigue(2, 'Top')],
        intrigueDiscard: [intrigue(3, 'Played')],
      })
    )
    expect(piles.find(item => item.id === 'intrigue-deck')?.cards.map(face => face.name)).toEqual([
      'Top',
      'Bottom',
    ])
    expect(piles.find(item => item.id === 'intrigue-discard')?.cards.map(face => face.name)).toEqual([
      'Played',
    ])
  })

  it('builds the conflict deck from the pool minus the current card and the discard', () => {
    const [current, discarded, remaining] = CONFLICTS
    const piles = listBoardDeckPiles(
      state({
        currentConflict: current,
        conflictsDiscard: [discarded],
      })
    )
    const deckKeys = piles.find(item => item.id === 'conflict-deck')?.cards.map(face => face.key) ?? []
    const discardKeys = piles.find(item => item.id === 'conflict-discard')?.cards.map(face => face.key) ?? []
    expect(deckKeys.some(key => key.startsWith(`${current.id}-`))).toBe(false)
    expect(deckKeys.some(key => key.startsWith(`${discarded.id}-`))).toBe(false)
    expect(deckKeys.some(key => key.startsWith(`${remaining.id}-`))).toBe(true)
    expect(discardKeys.some(key => key.startsWith(`${discarded.id}-`))).toBe(true)
  })

  it('omits expansion piles unless that expansion is on', () => {
    const base = listBoardDeckPiles(state()).map(item => item.id)
    expect(base).toEqual([
      'imperium-deck',
      'imperium-discard',
      'intrigue-deck',
      'intrigue-discard',
      'conflict-deck',
      'conflict-discard',
    ])

    const immortality = listBoardDeckPiles(
      state({
        expansions: { ...NO_EXPANSIONS, immortality: true },
        tleilaxuRow: [card(3001, 'On row')],
        tleilaxuRowDeck: [card(3001, 'On row'), card(3002, 'In deck'), card(3003, 'Bought')],
        players: [{ discardPile: [card(3003, 'Bought')] } as GameState['players'][number]],
      })
    )
    expect(immortality.find(item => item.id === 'tleilaxu-deck')?.cards.map(face => face.name)).toEqual([
      'In deck',
    ])
    expect(immortality.some(item => item.id === 'tech-deck')).toBe(false)

    const rise = listBoardDeckPiles(
      state({
        expansions: { ...NO_EXPANSIONS, riseOfIx: true },
        ixBoard: { stacks: [[TechTileId.ARTILLERY], [], []], nextFaceUpRevealed: {} },
        players: [{ tech: [{ id: TechTileId.FLAGSHIP, faceUp: true }] } as GameState['players'][number]],
      })
    )
    const techNames = rise.find(item => item.id === 'tech-deck')?.cards.map(face => face.name) ?? []
    expect(techNames).not.toContain('Artillery')
    expect(techNames).not.toContain('Flagship')
    expect(techNames).toContain('Windtraps')
    expect(rise.some(item => item.id === 'tleilaxu-deck')).toBe(false)
  })
})
