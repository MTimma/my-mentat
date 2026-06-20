import { RewardType, TurnType, type GameState } from '../types/GameTypes'
import {
  computeTurnGainTotals,
  getGainsForHistoryRow,
  groupGainsBySource,
  isCombatHistoryEntry,
  isEndgameHistoryEntry,
  TURN_TOTAL_RESOURCE_ORDER,
} from '../utils/turnGainsDisplay'
import {
  getHistoryRowBadge,
  getHistoryRowLabel,
  getTurnActionLabel,
  isMetaHistoryEntry,
} from '../utils/turnHistoryDisplay'
import {
  getRevealTurnStats,
  resolvePlayedCardForTurn,
} from '../utils/revealTurnStats'

export interface TurnHistoryRowProjection {
  index: number
  historyEntryKind?: GameState['historyEntryKind']
  playerId?: number
  turnType?: string
  badge: string
  rowLabel: string
  actionLabel?: string
  playedCardName?: string
  revealedCardNames?: string[]
  acquiredCardNames?: string[]
  gainSummary: string[]
}

const RESOURCE_LABELS: Partial<Record<RewardType, string>> = {
  [RewardType.PERSUASION]: 'Persuasion',
  [RewardType.SPICE]: 'Spice',
  [RewardType.WATER]: 'Water',
  [RewardType.SOLARI]: 'Solari',
  [RewardType.TROOPS]: 'Troops',
  [RewardType.POOL_TROOP]: 'Pool troop',
  [RewardType.DRAW]: 'Draw',
  [RewardType.INTRIGUE]: 'Intrigue',
  [RewardType.COMBAT]: 'Combat',
  [RewardType.DEPLOY]: 'Deploy',
  [RewardType.DREADNOUGHT]: 'Dreadnought',
  [RewardType.VICTORY_POINTS]: 'Victory points',
  [RewardType.MENTAT]: 'Mentat',
  [RewardType.AGENT]: 'Agent',
  [RewardType.CONTROL]: 'Control',
  [RewardType.DISCARD]: 'Discard',
  [RewardType.TRASH]: 'Trash',
  [RewardType.RECALL]: 'Recall',
}

function formatSigned(value: number): string {
  if (value === 0) return '0'
  if (value < 0) return `−${Math.abs(value)}`
  return `+${value}`
}

/** Stable gain summary strings aligned with TurnGainsDisplay aria patterns. */
export function formatGainSummaryForRow(turn: GameState): string[] {
  const gains = getGainsForHistoryRow(turn)
  const lines: string[] = []

  if (isCombatHistoryEntry(turn) || isEndgameHistoryEntry(turn)) {
    for (const group of groupGainsBySource(gains)) {
      const totals = computeTurnGainTotals(group.gains)
      for (const resource of totals.resources) {
        if (resource.net === 0) continue
        const label = RESOURCE_LABELS[resource.type] ?? resource.type
        lines.push(`${group.title}: ${label} net ${formatSigned(resource.net)}`)
      }
      for (const inf of totals.influence) {
        if (inf.net === 0) continue
        lines.push(`${group.title}: ${inf.faction} influence net ${formatSigned(inf.net)}`)
      }
    }
    return lines.sort()
  }

  const totals = computeTurnGainTotals(gains)
  for (const type of TURN_TOTAL_RESOURCE_ORDER) {
    const resource = totals.resources.find(r => r.type === type)
    if (!resource || resource.net === 0) continue
    const label = RESOURCE_LABELS[type] ?? type
    lines.push(`${label} net ${formatSigned(resource.net)}`)
  }
  for (const inf of totals.influence) {
    if (inf.net === 0) continue
    lines.push(`${inf.faction} influence net ${formatSigned(inf.net)}`)
  }
  for (const card of totals.cards) {
    lines.push(`${card.name} ×${card.count}`)
  }

  return lines
}

/** Project each history row into stable, testable display fields. */
export function projectTurnHistory(history: GameState[]): TurnHistoryRowProjection[] {
  return history.map((turn, index) => {
    const rowLabel = getHistoryRowLabel(history, index)
    const badge = getHistoryRowBadge(turn, index, history)
    const isMeta = isMetaHistoryEntry(turn)
    const playerId = turn.currTurn?.playerId ?? turn.activePlayerId
    const turnType = turn.currTurn?.type

    const projection: TurnHistoryRowProjection = {
      index,
      historyEntryKind: turn.historyEntryKind,
      badge,
      rowLabel,
      gainSummary: formatGainSummaryForRow(turn),
    }

    if (playerId != null) projection.playerId = playerId
    if (turnType != null) projection.turnType = turnType

    if (!isMeta) {
      projection.actionLabel = getTurnActionLabel(turn)
      const played = resolvePlayedCardForTurn(turn)
      if (played) projection.playedCardName = played.name

      if (turn.currTurn?.type === TurnType.REVEAL && playerId != null) {
        const stats = getRevealTurnStats(turn, playerId)
        if (stats) {
          if (stats.revealedCards.length > 0) {
            projection.revealedCardNames = stats.revealedCards.map(c => c.name).sort()
          }
          if (stats.acquiredCards.length > 0) {
            projection.acquiredCardNames = stats.acquiredCards.map(c => c.name).sort()
          }
        }
      }
    }

    return projection
  })
}
