import { BOARD_SPACES } from '../data/boardSpaces'
import { intrigueCards } from '../services/IntrigueDeckService'
import type { Card, GameState, IntrigueCard } from '../types/GameTypes'
import { TurnType } from '../types/GameTypes'
import { getTotalVictoryPoints } from './influenceVictoryPoints'
import { getAcquiredCardsForTurn, getRevealTurnStats, resolveCardInSnapshot } from './revealTurnStats'

export interface PlayerResourceSnapshot {
  playerId: number
  vp: number
  spice: number
  solari: number
  water: number
  troops: number
}

export type EndgameAnalyticsKind = 'setup' | 'turn' | 'combat' | 'endgame' | 'current'

export interface EndgameAnalyticsPoint {
  index: number
  label: string
  kind: EndgameAnalyticsKind
  players: PlayerResourceSnapshot[]
}

export interface NamedCardStat {
  cardId: number
  cardName: string
  image: string
  count: number
}

export interface BoardVisitStat {
  spaceId: number
  spaceName: string
  count: number
}

export interface PlayerDeckSnapshot {
  deck: Card[]
  discard: Card[]
  trash: Card[]
  handCount: number
}

export interface PlayerGameStatistics {
  playerId: number
  agentTurns: number
  revealTurns: number
  cardsPlayed: NamedCardStat[]
  cardsRevealed: NamedCardStat[]
  cardsAcquired: NamedCardStat[]
  intriguePlayed: NamedCardStat[]
  intrigueRevealed: IntrigueCard[]
  boardVisits: BoardVisitStat[]
  deckSnapshot: PlayerDeckSnapshot
}

function snapshotPlayers(state: GameState): PlayerResourceSnapshot[] {
  return state.players.map(p => ({
    playerId: p.id,
    vp: getTotalVictoryPoints(p, state),
    spice: p.spice + (state.endgameTiebreakerSpice?.[p.id] ?? 0),
    solari: p.solari,
    water: p.water,
    troops: p.troops,
  }))
}

function labelForHistoryEntry(entry: GameState, index: number): string {
  if (entry.historyEntryKind === 'setup') return 'Setup'
  if (entry.historyEntryKind === 'combat') return `Combat (R${entry.currentRound})`
  if (entry.historyEntryKind === 'endgame') return 'Endgame'
  if (entry.historyEntryKind === 'round-start') return `Round ${entry.currentRound}`
  if (entry.currTurn?.type === TurnType.REVEAL) return `Reveal · T${index}`
  if (entry.currTurn?.type === TurnType.ACTION) return `Agent · T${index}`
  return `Turn ${index}`
}

function kindForHistoryEntry(entry: GameState): EndgameAnalyticsKind {
  if (entry.historyEntryKind === 'setup') return 'setup'
  if (entry.historyEntryKind === 'combat') return 'combat'
  if (entry.historyEntryKind === 'endgame') return 'endgame'
  return 'turn'
}

/** Build per-turn resource snapshots from history plus the live state. */
export function buildEndgameAnalytics(
  history: GameState[],
  current: GameState
): EndgameAnalyticsPoint[] {
  const points: EndgameAnalyticsPoint[] = history.map((entry, index) => ({
    index,
    label: labelForHistoryEntry(entry, index),
    kind: kindForHistoryEntry(entry),
    players: snapshotPlayers(entry),
  }))

  points.push({
    index: history.length,
    label: current.endgameWinners?.length ? 'Final' : 'Current',
    kind: 'current',
    players: snapshotPlayers(current),
  })

  return points
}

export type EndgameResourceMetric = 'vp' | 'spice' | 'solari' | 'water' | 'troops'

export const ENDGAME_RESOURCE_METRICS: Array<{ key: EndgameResourceMetric; label: string }> = [
  { key: 'vp', label: 'Victory Points' },
  { key: 'spice', label: 'Spice' },
  { key: 'solari', label: 'Solari' },
  { key: 'water', label: 'Water' },
  { key: 'troops', label: 'Garrison Troops' },
]

export type EndgameAnalyticsSection =
  | 'resources'
  | 'decks'
  | 'intrigues'
  | 'card-plays'
  | 'acquire-reveal'
  | 'board-visits'

export const ENDGAME_ANALYTICS_SECTIONS: Array<{ key: EndgameAnalyticsSection; label: string }> = [
  { key: 'resources', label: 'Resources' },
  { key: 'decks', label: 'Decks' },
  { key: 'intrigues', label: 'Intrigues' },
  { key: 'card-plays', label: 'Card Plays' },
  { key: 'acquire-reveal', label: 'Acquire / Reveal' },
  { key: 'board-visits', label: 'Board Visits' },
]

function emptyPlayerStats(playerId: number): PlayerGameStatistics {
  return {
    playerId,
    agentTurns: 0,
    revealTurns: 0,
    cardsPlayed: [],
    cardsRevealed: [],
    cardsAcquired: [],
    intriguePlayed: [],
    intrigueRevealed: [],
    boardVisits: [],
    deckSnapshot: { deck: [], discard: [], trash: [], handCount: 0 },
  }
}

function incrementCardStat(map: Map<number, NamedCardStat>, card: Card) {
  const existing = map.get(card.id)
  if (existing) {
    existing.count += 1
    return
  }
  map.set(card.id, {
    cardId: card.id,
    cardName: card.name,
    image: card.image,
    count: 1,
  })
}

function incrementBoardVisit(map: Map<number, BoardVisitStat>, spaceId: number) {
  const space = BOARD_SPACES.find(s => s.id === spaceId)
  const spaceName = space?.name ?? `Space ${spaceId}`
  const existing = map.get(spaceId)
  if (existing) {
    existing.count += 1
    return
  }
  map.set(spaceId, { spaceId, spaceName, count: 1 })
}

function resolveIntrigueInSnapshot(state: GameState, cardId: number): IntrigueCard | undefined {
  return (
    state.intrigueDiscard.find(c => c.id === cardId) ??
    state.intrigueDeck.find(c => c.id === cardId) ??
    Object.values(state.endgameRevealedIntrigue ?? {})
      .flat()
      .find(c => c.id === cardId) ??
    intrigueCards.find(c => c.id === cardId)
  )
}

function sortedCardStats(map: Map<number, NamedCardStat>): NamedCardStat[] {
  return [...map.values()].sort((a, b) => b.count - a.count || a.cardName.localeCompare(b.cardName))
}

function sortedBoardVisits(map: Map<number, BoardVisitStat>): BoardVisitStat[] {
  return [...map.values()].sort((a, b) => b.count - a.count || a.spaceName.localeCompare(b.spaceName))
}

function isAggregatableTurnEntry(entry: GameState): boolean {
  if (entry.historyEntryKind === 'setup' || entry.historyEntryKind === 'round-start') return false
  return entry.currTurn != null
}

/** Aggregate deck, intrigue, card-play, acquire/reveal, and board-visit stats from history. */
export function buildEndgameGameStatistics(
  history: GameState[],
  current: GameState
): Record<number, PlayerGameStatistics> {
  const stats: Record<number, PlayerGameStatistics> = {}
  const playedMaps: Record<number, Map<number, NamedCardStat>> = {}
  const revealedMaps: Record<number, Map<number, NamedCardStat>> = {}
  const acquiredMaps: Record<number, Map<number, NamedCardStat>> = {}
  const intrigueMaps: Record<number, Map<number, NamedCardStat>> = {}
  const boardMaps: Record<number, Map<number, BoardVisitStat>> = {}

  const ensure = (playerId: number) => {
    if (!stats[playerId]) {
      stats[playerId] = emptyPlayerStats(playerId)
      playedMaps[playerId] = new Map()
      revealedMaps[playerId] = new Map()
      acquiredMaps[playerId] = new Map()
      intrigueMaps[playerId] = new Map()
      boardMaps[playerId] = new Map()
    }
    return stats[playerId]
  }

  for (const player of current.players) {
    ensure(player.id)
  }

  const entries = [...history.filter(isAggregatableTurnEntry), current]

  for (const entry of entries) {
    const turn = entry.currTurn
    if (!turn) continue
    const playerId = turn.playerId
    const playerStats = ensure(playerId)

    if (turn.type === TurnType.ACTION) {
      playerStats.agentTurns += 1
      if (turn.cardId != null) {
        const card = resolveCardInSnapshot(entry, playerId, turn.cardId)
        if (card) incrementCardStat(playedMaps[playerId], card)
      }
      if (turn.agentSpaceId != null) {
        incrementBoardVisit(boardMaps[playerId], turn.agentSpaceId)
      }
    }

    if (turn.type === TurnType.REVEAL) {
      playerStats.revealTurns += 1
      const revealStats = getRevealTurnStats(entry, playerId)
      if (revealStats) {
        for (const card of revealStats.revealedCards) {
          incrementCardStat(revealedMaps[playerId], card)
        }
        for (const card of revealStats.acquiredCards) {
          incrementCardStat(acquiredMaps[playerId], card)
        }
      }
    }

    for (const play of turn.playedIntrigueCard ?? []) {
      const card = resolveIntrigueInSnapshot(entry, play.cardId)
      if (card) incrementCardStat(intrigueMaps[playerId], card)
    }
  }

  for (const [playerIdStr, cards] of Object.entries(current.endgameRevealedIntrigue ?? {})) {
    const playerId = Number(playerIdStr)
    ensure(playerId).intrigueRevealed = [...cards]
  }

  for (const player of current.players) {
    const playerStats = ensure(player.id)
    playerStats.cardsPlayed = sortedCardStats(playedMaps[player.id])
    playerStats.cardsRevealed = sortedCardStats(revealedMaps[player.id])
    playerStats.cardsAcquired = sortedCardStats(acquiredMaps[player.id])
    playerStats.intriguePlayed = sortedCardStats(intrigueMaps[player.id])
    playerStats.boardVisits = sortedBoardVisits(boardMaps[player.id])
    playerStats.deckSnapshot = {
      deck: [...player.deck],
      discard: [...player.discardPile],
      trash: [...player.trash],
      handCount: player.handCount,
    }
  }

  return stats
}

/** All board spaces visited by any player, for cross-player comparison tables. */
export function collectBoardVisitRows(
  gameStats: Record<number, PlayerGameStatistics>
): BoardVisitStat[] {
  const bySpace = new Map<number, BoardVisitStat>()
  for (const playerStats of Object.values(gameStats)) {
    for (const visit of playerStats.boardVisits) {
      const existing = bySpace.get(visit.spaceId)
      if (!existing) {
        bySpace.set(visit.spaceId, { ...visit })
      }
    }
  }
  return [...bySpace.values()].sort((a, b) => a.spaceName.localeCompare(b.spaceName))
}
