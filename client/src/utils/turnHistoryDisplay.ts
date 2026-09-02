import { BOARD_SPACES } from '../data/boardSpaces'
import { GamePhase, GameState, TurnType } from '../types/GameTypes'
import { shouldHideLiveHistoryEntry } from './endgameHistoryDisplay'
import { resolvePlayedCardsForTurn } from './revealTurnStats'

/** Non-player rows: setup, round start, combat resolution. */
export function isMetaHistoryEntry(turn: GameState | undefined): boolean {
  if (!turn) return false
  const kind = turn.historyEntryKind
  return kind === 'setup' || kind === 'round-start' || kind === 'combat' || kind === 'endgame'
}

/** Round-start divider rows, including the merged opening snapshot still tagged as setup. */
export function isRoundStartHistoryEntry(turn: GameState | undefined): boolean {
  if (!turn) return false
  if (turn.historyEntryKind === 'round-start') return true
  return (
    turn.historyEntryKind === 'setup' &&
    turn.phase === GamePhase.PLAYER_TURNS &&
    !turn.sandboxSetup
  )
}

export function getRoundStartLabel(turn: GameState): string {
  return `Round ${turn.currentRound} start`
}

export function isPlayerTurnHistoryEntry(turn: GameState | undefined): boolean {
  return turn != null && !isMetaHistoryEntry(turn)
}

/** 1-based player turn number at `index`, or null for meta rows. */
export function getPlayerTurnNumber(turns: GameState[], index: number): number | null {
  const turn = turns[index]
  if (!turn || isMetaHistoryEntry(turn)) return null
  let num = 0
  for (let i = 0; i <= index; i++) {
    if (isPlayerTurnHistoryEntry(turns[i])) num++
  }
  return num
}

export function countPlayerTurns(turns: GameState[]): number {
  return turns.filter(isPlayerTurnHistoryEntry).length
}

/** 1-based number for the in-progress turn row (after all completed player turns). */
export function getLivePlayerTurnNumber(turns: GameState[], offset = 0): number {
  return countPlayerTurns(turns) + 1 + Math.max(0, offset)
}

/** Round label for play chrome; null when the position is imaginary (no round shown). */
export function getDisplayRound(state: GameState): number | null {
  if (state.hideRoundLabel) return null
  return state.currentRound
}

export function formatTurnRoundHeader(turnNum: number, round: number | null): string {
  return round != null ? `Turn ${turnNum}, round ${round}` : `Turn ${turnNum}`
}

/** Human-readable label for a history row or the live in-progress turn. */
export function getHistoryRowLabel(turns: GameState[], index: number): string {
  if (index >= turns.length) {
    return `Turn ${getLivePlayerTurnNumber(turns)}`
  }
  const turn = turns[index]
  if (!turn) return `Turn ${index}`
  if (isRoundStartHistoryEntry(turn)) return getRoundStartLabel(turn)
  if (index === 0 || turn.historyEntryKind === 'setup') return 'Setup'
  if (turn.historyEntryKind === 'combat') return 'Combat'
  if (turn.historyEntryKind === 'endgame') return 'Endgame'
  const playerTurnNum = getPlayerTurnNumber(turns, index)
  return playerTurnNum != null ? `Turn ${playerTurnNum}` : `Turn ${index}`
}

/** Board space name, "Reveal", "Agent", etc. for a player turn row. */
export function getTurnActionLabel(turn: GameState): string {
  if (turn.phase === GamePhase.COMBAT) return 'Combat'
  const curr = turn.currTurn
  if (!curr) return '—'
  if (curr.type === TurnType.ACTION) {
    const spaceId = curr.agentSpaceId
    if (spaceId != null) {
      const space = BOARD_SPACES.find(s => s.id === spaceId)
      if (space) return space.name
    }
    return 'Agent'
  }
  if (curr.type === TurnType.REVEAL) return 'Reveal'
  if (curr.type === TurnType.PASS) return 'Pass'
  return curr.type
}

export function getHistoryRowBadge(turn: GameState, index: number, turns: GameState[]): string {
  if (turn.historyEntryKind === 'endgame') return 'Endgame'
  if (turn.historyEntryKind === 'combat') return 'Combat'
  if (isRoundStartHistoryEntry(turn)) return ''
  if (index === 0 || turn.historyEntryKind === 'setup') return 'Setup'
  const playerTurnNum = getPlayerTurnNumber(turns, index)
  return playerTurnNum != null ? String(playerTurnNum) : String(index)
}

export type BirdseyeHistoryBannerKind = 'setup' | 'round-start' | 'combat' | 'endgame'

export interface BirdseyeHistoryCell {
  historyIndex: number
  playerId: number
  isLive: boolean
}

export interface BirdseyeHistoryBanner {
  kind: BirdseyeHistoryBannerKind
  historyIndex: number
  isLive: boolean
  label: string
  round?: number
}

export type BirdseyeHistoryGridRow =
  | { type: 'banner'; banner: BirdseyeHistoryBanner }
  | { type: 'turns'; cells: Array<BirdseyeHistoryCell | null> }

export interface BirdseyeHistoryRoundGroup {
  key: string
  round?: number
  rows: BirdseyeHistoryGridRow[]
}

function bannerStartsRoundGroup(banner: BirdseyeHistoryBanner): boolean {
  return banner.kind === 'round-start' || banner.kind === 'setup' || banner.kind === 'endgame'
}

/**
 * Groups chess-grid rows so each round (plus its trailing combat) is one
 * scroll-snap section. Setup and endgame stay their own groups.
 */
export function groupBirdseyeHistoryRounds(
  rows: BirdseyeHistoryGridRow[]
): BirdseyeHistoryRoundGroup[] {
  const groups: BirdseyeHistoryRoundGroup[] = []

  const startGroup = (row: BirdseyeHistoryGridRow): BirdseyeHistoryRoundGroup => {
    const round = row.type === 'banner' ? row.banner.round : undefined
    const key =
      row.type === 'banner'
        ? `${row.banner.kind}-${row.banner.historyIndex}`
        : `turns-${groups.length}`
    const group = { key, round, rows: [row] }
    groups.push(group)
    return group
  }

  for (const row of rows) {
    const last = groups[groups.length - 1]
    const startsRound = row.type === 'banner' && bannerStartsRoundGroup(row.banner)
    if (!last || startsRound) {
      startGroup(row)
      continue
    }
    last.rows.push(row)
    if (last.round == null && row.type === 'banner' && row.banner.round != null) {
      last.round = row.banner.round
    }
  }

  return groups
}

export function birdseyeRoundGroupContainsIndex(
  group: BirdseyeHistoryRoundGroup,
  historyIndex: number,
  isLive: boolean
): boolean {
  return group.rows.some(row => {
    if (row.type === 'banner') {
      return row.banner.historyIndex === historyIndex && row.banner.isLive === isLive
    }
    return row.cells.some(
      cell => cell != null && cell.historyIndex === historyIndex && cell.isLive === isLive
    )
  })
}

function historyPlayerId(turn: GameState): number | undefined {
  return turn.currTurn?.playerId ?? turn.activePlayerId
}

function bannerForMeta(turn: GameState, historyIndex: number, isLive: boolean): BirdseyeHistoryBanner {
  if (turn.historyEntryKind === 'combat') {
    return { kind: 'combat', historyIndex, isLive, label: 'Combat', round: turn.currentRound }
  }
  if (turn.historyEntryKind === 'endgame') {
    return { kind: 'endgame', historyIndex, isLive, label: 'Endgame' }
  }
  if (isRoundStartHistoryEntry(turn)) {
    return {
      kind: 'round-start',
      historyIndex,
      isLive,
      label: getRoundStartLabel(turn),
      round: turn.currentRound,
    }
  }
  return { kind: 'setup', historyIndex, isLive, label: 'Setup', round: turn.currentRound }
}

function isLivePlayerTurn(state: GameState): boolean {
  if (state.sandboxSetup) return false
  if (state.historyEntryKind === 'combat' || state.historyEntryKind === 'endgame') return false
  if (state.phase === GamePhase.COMBAT || state.phase === GamePhase.END_GAME) return false
  return state.phase === GamePhase.PLAYER_TURNS
}

function liveBannerKind(state: GameState): BirdseyeHistoryBannerKind | null {
  if (state.phase === GamePhase.END_GAME || state.historyEntryKind === 'endgame') return 'endgame'
  if (state.phase === GamePhase.COMBAT || state.historyEntryKind === 'combat') return 'combat'
  return null
}

/**
 * Chess.com-style move grid: one column per leader (player id order).
 * A new row starts when a column would collide, and at every round/combat
 * boundary so a rotating first player does not shift under the wrong seat.
 */
export function buildBirdseyeTurnHistoryGrid(
  history: GameState[],
  playerIds: number[],
  liveState?: GameState | null
): BirdseyeHistoryGridRow[] {
  const colCount = playerIds.length
  if (colCount === 0) return []

  const colOf = new Map(playerIds.map((id, index) => [id, index]))
  const rows: BirdseyeHistoryGridRow[] = []
  let cells: Array<BirdseyeHistoryCell | null> = Array(colCount).fill(null)

  const rowHasTurns = () => cells.some(cell => cell != null)

  const flush = () => {
    if (!rowHasTurns()) return
    rows.push({ type: 'turns', cells })
    cells = Array(colCount).fill(null)
  }

  const placeTurn = (historyIndex: number, playerId: number, isLive: boolean) => {
    const col = colOf.get(playerId)
    if (col == null) return
    if (cells[col] != null) flush()
    cells[col] = { historyIndex, playerId, isLive }
  }

  for (let index = 0; index < history.length; index++) {
    const turn = history[index]
    if (!turn) continue
    if (isMetaHistoryEntry(turn)) {
      flush()
      rows.push({ type: 'banner', banner: bannerForMeta(turn, index, false) })
      continue
    }
    const playerId = historyPlayerId(turn)
    if (playerId == null) continue
    placeTurn(index, playerId, false)
  }

  if (liveState && !shouldHideLiveHistoryEntry(history, liveState)) {
    if (isLivePlayerTurn(liveState)) {
      const playerId = historyPlayerId(liveState)
      if (playerId != null) placeTurn(history.length, playerId, true)
    } else {
      const kind = liveBannerKind(liveState)
      if (kind) {
        const last = rows[rows.length - 1]
        const alreadyListed =
          last?.type === 'banner' && last.banner.kind === kind && !last.banner.isLive
        if (!alreadyListed) {
          flush()
          rows.push({
            type: 'banner',
            banner: bannerForMeta(
              {
                ...liveState,
                historyEntryKind: kind,
              },
              history.length,
              true
            ),
          })
        }
      }
    }
  }

  flush()
  return rows
}

/** Compact chess-style cell copy: played card and destination, or Reveal/Pass. */
export function getBirdseyeHistoryCellParts(turn: GameState): { played?: string; action: string } {
  const action = getTurnActionLabel(turn)
  if (turn.currTurn?.type === TurnType.REVEAL || turn.currTurn?.type === TurnType.PASS) {
    return { action }
  }
  const played = resolvePlayedCardsForTurn(turn)
    .map(card => card.name)
    .filter(Boolean)
    .join(' + ')
  return played ? { played, action } : { action }
}
