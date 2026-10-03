import { conflictCardImageSrc } from '../data/conflictCardImages'
import { getConflictPool } from '../data/conflicts'
import { TECH_TILES, type TechTileId } from '../data/techTiles'
import type { Card, ConflictCard, GameState, IntrigueCard } from '../types/GameTypes'
import { ixBoardTechTileIds, playerTechTileIds } from './sandboxTechTiles'

export interface BoardDeckFace {
  key: string
  name: string
  image: string | null
  note?: string
}

export interface BoardDeckPile {
  id: string
  label: string
  /** One line on what this pile includes. */
  detail?: string
  cards: BoardDeckFace[]
}

function cardFace(card: { id: number; name: string; image?: string }, index: number, note?: string): BoardDeckFace {
  const image = card.image?.trim() ? card.image : null
  return {
    key: `${card.id}-${index}`,
    name: card.name,
    image,
    note,
  }
}

function conflictFace(card: ConflictCard, index: number): BoardDeckFace {
  return {
    key: `${card.id}-${index}`,
    name: card.name,
    image: conflictCardImageSrc(card.id),
  }
}

function playerCardIds(players: GameState['players']): Set<number> {
  const ids = new Set<number>()
  for (const player of players) {
    for (const pile of [player.deck, player.discardPile, player.playArea, player.trash]) {
      for (const card of pile ?? []) ids.add(card.id)
    }
  }
  return ids
}

function imperiumDeck(state: GameState, taken: Set<number>): Card[] {
  return state.imperiumRowDeck.filter(card => !taken.has(card.id))
}

function imperiumDiscard(state: GameState): Card[] {
  const cards = [...(state.imperiumRowDiscard ?? [])]
  const helena = state.helenaRemovedCard?.card
  if (helena && !cards.some(card => card.id === helena.id)) cards.push(helena)
  return cards
}

/** Intrigue deck stores the top card at the end of the array. */
function intrigueTopFirst(cards: IntrigueCard[]): IntrigueCard[] {
  return [...cards].reverse()
}

function conflictDeck(state: GameState): ConflictCard[] {
  const gone = new Set<number>()
  if (state.currentConflict?.id) gone.add(state.currentConflict.id)
  for (const card of state.conflictsDiscard ?? []) gone.add(card.id)
  return getConflictPool(state.expansions).filter(card => !gone.has(card.id))
}

function tleilaxuDeck(state: GameState, owned: Set<number>): Card[] {
  const onRow = new Set((state.tleilaxuRow ?? []).map(card => card.id))
  return (state.tleilaxuRowDeck ?? []).filter(card => !onRow.has(card.id) && !owned.has(card.id))
}

function techDeck(state: GameState): BoardDeckFace[] {
  const placed = new Set<TechTileId>([
    ...ixBoardTechTileIds(state.ixBoard),
    ...playerTechTileIds(state.players),
  ])
  return TECH_TILES.filter(tile => !placed.has(tile.id)).map((tile, index) => ({
    key: `${tile.id}-${index}`,
    name: tile.name,
    image: tile.image,
  }))
}

/** Piles opened from the board "Board decks & discards" button. */
export function listBoardDeckPiles(state: GameState): BoardDeckPile[] {
  const owned = playerCardIds(state.players)
  const helenaId = state.helenaRemovedCard?.card.id
  const takenFromImperium = new Set(owned)
  for (const card of state.imperiumRow) takenFromImperium.add(card.id)
  for (const card of state.imperiumRowDiscard ?? []) takenFromImperium.add(card.id)
  if (helenaId != null) takenFromImperium.add(helenaId)

  const discard = imperiumDiscard(state)

  const piles: BoardDeckPile[] = [
    {
      id: 'imperium-deck',
      label: 'Imperium row deck',
      cards: imperiumDeck(state, takenFromImperium).map((card, index) => cardFace(card, index)),
    },
    {
      id: 'imperium-discard',
      label: 'Imperium row discard',
      cards: [...discard].reverse().map((card, index) =>
        cardFace(card, index, helenaId != null && card.id === helenaId ? 'Helena — not acquired' : undefined)
      ),
    },
    {
      id: 'intrigue-deck',
      label: 'Intrigue deck',
      cards: intrigueTopFirst(state.intrigueDeck).map((card, index) => cardFace(card, index)),
    },
    {
      id: 'intrigue-discard',
      label: 'Intrigue discard',
      cards: [...state.intrigueDiscard].reverse().map((card, index) => cardFace(card, index)),
    },
    {
      id: 'conflict-deck',
      label: 'Conflict deck',
      cards: conflictDeck(state).map(conflictFace),
    },
    {
      id: 'conflict-discard',
      label: 'Conflict discard',
      cards: [...(state.conflictsDiscard ?? [])].reverse().map(conflictFace),
    },
  ]

  if (state.expansions?.immortality) {
    piles.push({
      id: 'tleilaxu-deck',
      label: 'Tleilaxu deck',
      cards: tleilaxuDeck(state, owned).map((card, index) => cardFace(card, index)),
    })
  }

  if (state.expansions?.riseOfIx) {
    piles.push({
      id: 'tech-deck',
      label: 'Tech tile deck',
      cards: techDeck(state),
    })
  }

  return piles
}
