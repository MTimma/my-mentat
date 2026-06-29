import { ALL_IMPERIUM_ROW_CARDS, FOLDSPACE_DECK, STARTING_DECK } from '../data/cards'
import { getTechTileByName } from '../data/techTiles'
import { resolveGraftCards } from '../expansions/immortality/graft'
import {
  AcquiredTechTileSnapshot,
  Card,
  GameState,
  GainSource,
  RewardType,
  TurnType,
} from '../types/GameTypes'
import { findPlayerCardsByIds } from './playAreaDisplay'
import { computeTurnGainTotals, getGainsForTurnState, type TurnGainTotals } from './turnGainsDisplay'

export interface RevealTurnStats {
  revealedCards: Card[]
  acquiredCards: Card[]
  acquiredTechTiles: AcquiredTechTileSnapshot[]
  totals: TurnGainTotals
}

export function resolveCardInSnapshot(
  state: GameState,
  playerId: number,
  cardId: number
): Card | undefined {
  const fromTurn = state.currTurn?.acquiredCards?.find(c => c.id === cardId)
  if (fromTurn) return fromTurn

  const player = state.players.find(p => p.id === playerId)
  if (player) {
    const piles = [...player.deck, ...player.discardPile, ...player.playArea, ...player.trash]
    const fromPile = piles.find(c => c.id === cardId)
    if (fromPile) return fromPile
  }

  const fromRow = state.imperiumRow.find(c => c.id === cardId)
  if (fromRow) return fromRow

  return (
    ALL_IMPERIUM_ROW_CARDS.find(c => c.id === cardId) ??
    FOLDSPACE_DECK.find(c => c.id === cardId) ??
    STARTING_DECK.find(c => c.id === cardId)
  )
}

/** Agent-turn card played this turn — still resolvable after trash-this-card effects. */
export function resolvePlayedCardForTurn(state: GameState): Card | null {
  const cards = resolvePlayedCardsForTurn(state)
  return cards[0] ?? null
}

/** Agent-turn cards played this turn (both cards when grafted). */
export function resolvePlayedCardsForTurn(state: GameState): Card[] {
  const curr = state.currTurn
  if (!curr?.cardId || curr.type !== TurnType.ACTION || curr.playerId == null) return []

  const player = state.players.find(p => p.id === curr.playerId)
  if (!player) return []

  if (state.expansions?.immortality && state.graftPair?.cardIds?.length) {
    const graftCards = resolveGraftCards(state, player)
    if (graftCards.length > 0) return graftCards
    return findPlayerCardsByIds(player, state.graftPair.cardIds, { includeTrash: true })
  }

  const single = resolveCardInSnapshot(state, curr.playerId, curr.cardId)
  return single ? [single] : []
}

export function resolveCardInSnapshotByName(
  state: GameState,
  playerId: number,
  cardName: string
): Card | undefined {
  const byId = state.gains
    ?.filter(g => g.playerId === playerId && g.name === cardName)
    .map(g => resolveCardInSnapshot(state, playerId, g.sourceId))
    .find(Boolean)
  if (byId) return byId

  return (
    FOLDSPACE_DECK.find(c => c.name === cardName) ??
    ALL_IMPERIUM_ROW_CARDS.find(c => c.name === cardName) ??
    state.imperiumRow.find(c => c.name === cardName)
  )
}

export function deriveAcquiredCardsFromGains(state: GameState, playerId: number): Card[] {
  const round = state.currentRound
  const seen = new Set<number>()
  const cards: Card[] = []

  const pushResolvedCard = (cardId: number, fallbackName: string) => {
    if (seen.has(cardId)) return
    seen.add(cardId)
    const card =
      resolveCardInSnapshot(state, playerId, cardId) ??
      ({
        id: cardId,
        name: fallbackName,
        image: '',
        agentIcons: [],
      } satisfies Card)
    cards.push(card)
  }

  for (const gain of state.gains ?? []) {
    if (gain.playerId !== playerId || gain.round !== round) continue
    if (gain.source !== GainSource.CARD) continue

    if (gain.type === RewardType.CARD && !gain.name.endsWith(' Acquire')) {
      pushResolvedCard(gain.sourceId, gain.name)
      continue
    }

    // Reserve buys (SMF / AL) used to only log "… Acquire Effect" VP gains, not CARD gains.
    if (gain.name.endsWith(' Acquire Effect')) {
      const baseName = gain.name.replace(/ Acquire Effect$/, '')
      pushResolvedCard(gain.sourceId, baseName)
    }
  }

  return cards
}

function deriveRevealedCardsFromTurn(state: GameState, playerId: number): Card[] {
  const ids = state.currTurn?.revealedCardIds ?? []
  const seen = new Set<number>()
  const cards: Card[] = []

  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    const card = resolveCardInSnapshot(state, playerId, id)
    if (card) cards.push(card)
  }

  return cards
}

function deriveAcquiredTechTilesFromGains(state: GameState, playerId: number): AcquiredTechTileSnapshot[] {
  const round = state.currentRound
  const seen = new Set<string>()
  const tiles: AcquiredTechTileSnapshot[] = []

  for (const gain of state.gains ?? []) {
    if (gain.playerId !== playerId || gain.round !== round) continue
    if (gain.source !== GainSource.IX_BOARD || gain.type !== RewardType.TECH) continue
    if (seen.has(gain.name)) continue
    seen.add(gain.name)

    const fromTurn = state.currTurn?.acquiredTechTiles?.find(t => t.name === gain.name)
    if (fromTurn) {
      tiles.push(fromTurn)
      continue
    }

    const catalog = getTechTileByName(gain.name)
    if (catalog) {
      tiles.push({
        id: catalog.id,
        name: catalog.name,
        image: catalog.image,
        cost: catalog.cost,
      })
      continue
    }

    tiles.push({
      id: gain.name as AcquiredTechTileSnapshot['id'],
      name: gain.name,
      image: '',
      cost: 0,
    })
  }

  return tiles
}

/** Acquired imperium / reserve cards this turn (reveal or agent-turn intrigue acquire). */
export function getAcquiredCardsForTurn(state: GameState, playerId: number): Card[] {
  const currTurn = state.currTurn
  if (!currTurn || currTurn.playerId !== playerId) return []

  const fromTurn = currTurn.acquiredCards ?? []
  const fromGains = deriveAcquiredCardsFromGains(state, playerId)
  const acquired = new Map<number, Card>()
  for (const card of [...fromTurn, ...fromGains]) {
    acquired.set(card.id, card)
  }
  return [...acquired.values()]
}

/** Ix board tech tiles bought this turn (agent-turn tech shop acquire). */
export function getAcquiredTechTilesForTurn(
  state: GameState,
  playerId: number
): AcquiredTechTileSnapshot[] {
  const currTurn = state.currTurn
  if (!currTurn || currTurn.playerId !== playerId) return []

  const fromTurn = currTurn.acquiredTechTiles ?? []
  const fromGains = deriveAcquiredTechTilesFromGains(state, playerId)
  const acquired = new Map<string, AcquiredTechTileSnapshot>()
  for (const tile of [...fromTurn, ...fromGains]) {
    acquired.set(tile.id, tile)
  }
  return [...acquired.values()]
}

export function getRevealTurnStats(state: GameState, playerId: number): RevealTurnStats | null {
  const currTurn = state.currTurn
  if (!currTurn || currTurn.playerId !== playerId || currTurn.type !== TurnType.REVEAL) {
    return null
  }

  const turnGains = getGainsForTurnState(state)

  return {
    revealedCards: deriveRevealedCardsFromTurn(state, playerId),
    acquiredCards: getAcquiredCardsForTurn(state, playerId),
    acquiredTechTiles: getAcquiredTechTilesForTurn(state, playerId),
    totals: computeTurnGainTotals(turnGains),
  }
}

export function revealTurnStatsHasContent(stats: RevealTurnStats): boolean {
  return (
    stats.revealedCards.length > 0 ||
    stats.acquiredCards.length > 0 ||
    stats.acquiredTechTiles.length > 0 ||
    stats.totals.resources.some(r => r.net !== 0 || r.gained > 0 || r.spent > 0) ||
    stats.totals.influence.some(i => i.net !== 0 || i.gained > 0 || i.lost > 0) ||
    stats.totals.cards.length > 0
  )
}
