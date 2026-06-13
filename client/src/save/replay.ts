/**
 * Replay side of the event-sourced save format
 * (plans/reducer/01-save-format.md). Recording primitives live in
 * ./recording.ts (cycle-free, importable from GameContext).
 */
import type { GameAction } from '../components/GameContext/GameContext'
import { applyGameAction } from '../components/GameContext/GameContext'
import type { GameState } from '../types/GameTypes'
import { buildInitialState } from './buildInitialState'
import {
  assertJsonSerializable,
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
  return { state, divergences }
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
  const finalVp = Object.fromEntries(
    state.players.map(p => [p.id, p.victoryPoints])
  )
  const winner =
    state.endgameWinners && state.endgameWinners.length === 1
      ? state.endgameWinners[0]
      : null
  return {
    rounds: state.currentRound,
    winner,
    finalVp,
    players: doc.setup.players.map(p => ({
      id: p.id,
      leaderId: p.leaderId,
      color: p.color,
    })),
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
  record(action: GameAction, stateAfter?: GameState): void {
    if (!isReplayable(action)) return
    // Non-serializable payloads must fail at introduction, not at load time.
    assertJsonSerializable(action, action.type)
    const entry: EventEntry = { a: JSON.parse(JSON.stringify(action)) }
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
