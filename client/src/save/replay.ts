/**
 * Replay side of the event-sourced save format
 * (plans/reducer/01-save-format.md). Recording primitives live in
 * ./recording.ts (cycle-free, importable from GameContext).
 */
import type { GameAction } from '../components/GameContext/GameContext'
import { applyGameAction } from '../components/GameContext/GameContext'
import { repairLegacyTechDiscardState } from '../components/GameContext/riseOfIxReducer'
import type { GameState } from '../types/GameTypes'
import { compareEndgameStanding } from '../utils/endgameResolution'
import { getTotalVictoryPoints } from '../utils/influenceVictoryPoints'
import { buildInitialState } from './buildInitialState'
import {
  assertJsonSerializable,
  buildEventRecordContext,
  computeChecksum,
  isReplayable,
  REPLAYABLE_ACTIONS,
} from './recording'
import {
  SAVE_SCHEMA_VERSION,
  type EventEntry,
  type ReplayDivergence,
  type SaveDoc,
  type SaveSummary,
  type SetupBlock,
} from './types'

export { assertJsonSerializable, computeChecksum, isReplayable, REPLAYABLE_ACTIONS }

export interface ReplayResult {
  state: GameState
  divergences: ReplayDivergence[]
}

/** Fold events through the reducer, verifying END_TURN checksums when present. */
export function replayEvents(initial: GameState, events: EventEntry[]): ReplayResult {
  const divergences: ReplayDivergence[] = []
  let state = initial
  events.forEach((entry, eventIndex) => {
    state = applyGameAction(state, entry.a)
    if (entry.ck) {
      for (const [key, expected] of Object.entries(entry.ck)) {
        const playerId = Number(key.slice(1))
        const actual = computeChecksum(state, playerId)
        if (actual.some((v, i) => v !== expected[i])) {
          divergences.push({ eventIndex, playerId, expected, actual })
        }
      }
    }
  })
  return { state: repairLegacyTechDiscardState(state), divergences }
}

/** Events of the line `branchId` ('trunk' or branch id), resolved through parents. */
export function eventsForLine(doc: SaveDoc, branchId: string): EventEntry[] {
  if (branchId === 'trunk') return doc.events
  const branch = doc.branches.find(b => b.id === branchId)
  if (!branch) throw new Error(`Unknown branch: ${branchId}`)
  const parentEvents = eventsForLine(doc, branch.parent)
  return [...parentEvents.slice(0, branch.forkAtEvent), ...branch.events]
}

/** Replay a save document's line (default: cursor's branch). */
export function replaySaveDoc(
  doc: SaveDoc,
  branchId: string = doc.cursor.branch
): ReplayResult {
  const initial = buildInitialState(doc.setup)
  return replayEvents(initial, eventsForLine(doc, branchId))
}

export function summarize(doc: SaveDoc): SaveSummary {
  const { state } = replaySaveDoc(doc, 'trunk')
  const players = [...doc.setup.players]
    .sort((a, b) => {
      const playerA = state.players.find(p => p.id === a.id)
      const playerB = state.players.find(p => p.id === b.id)
      if (!playerA || !playerB) return 0
      return compareEndgameStanding(state, playerA, playerB)
    })
    .map(setupPlayer => {
      const player = state.players.find(p => p.id === setupPlayer.id)
      return {
        id: setupPlayer.id,
        leaderId: setupPlayer.leaderId,
        color: setupPlayer.color,
        vp: player ? getTotalVictoryPoints(player, state) : 0,
      }
    })
  const finalVp = Object.fromEntries(players.map(p => [p.id, p.vp]))
  const winner =
    state.endgameWinners && state.endgameWinners.length === 1
      ? state.endgameWinners[0]
      : null
  return {
    rounds: state.currentRound,
    winner,
    finalVp,
    players,
    eventCount: doc.events.length,
  }
}

/** Recorder collecting replayable actions at the dispatch boundary. */
export class GameRecorder {
  private events: EventEntry[] = []

  constructor(
    public readonly setup: SetupBlock,
    private readonly meta: { id: string; title: string }
  ) {}

  /** Record `action` (if replayable). `stateAfter` adds END_TURN checksums. */
  record(action: GameAction, stateBefore?: GameState, stateAfter?: GameState): void {
    if (!isReplayable(action)) return
    // Non-serializable payloads must fail at introduction, not at load time.
    assertJsonSerializable(action, action.type)
    const entry: EventEntry = {
      a: JSON.parse(JSON.stringify(action)),
      ...(stateBefore
        ? { ctx: buildEventRecordContext(stateBefore, this.events) }
        : {}),
    }
    if (action.type === 'END_TURN' && stateAfter) {
      entry.ck = { [`p${action.playerId}`]: computeChecksum(stateAfter, action.playerId) }
    }
    this.events.push(entry)
  }

  get eventCount(): number {
    return this.events.length
  }

  /** Truncate is intentionally NOT offered: undo forks a branch (plan 01 §4). */
  toSaveDoc(now: () => string = () => new Date().toISOString()): SaveDoc {
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      meta: {
        id: this.meta.id,
        title: this.meta.title,
        createdAt: now(),
        updatedAt: now(),
      },
      setup: JSON.parse(JSON.stringify(this.setup)),
      events: JSON.parse(JSON.stringify(this.events)),
      branches: [],
      cursor: { branch: 'trunk', event: this.events.length },
    }
  }
}
