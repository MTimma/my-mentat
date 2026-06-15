/**
 * Cycle-free recording primitives (plans/reducer/01-save-format.md).
 * Imported by GameContext (the dispatch boundary) — must not import the
 * reducer at runtime; only type-level imports are allowed here.
 */
import type { GameAction } from '../components/GameContext/GameContext'
import type { GameState } from '../types/GameTypes'
import type { EventEntry, PlayerChecksum } from './types'

/** Decision events that must not appear twice in a row (Strict Mode / double-click). */
const CONSECUTIVE_DEDUP_ACTIONS: ReadonlySet<GameAction['type']> = new Set([
  'CLAIM_ALL_REWARDS',
  'END_TURN',
  'RESOLVE_CHOICE',
  'SANDBOX_COMMIT_SETUP',
])

function decisionEventFingerprint(action: GameAction): string | null {
  if (!CONSECUTIVE_DEDUP_ACTIONS.has(action.type)) return null
  return JSON.stringify(action)
}

/** Whether to append `action` after `prev → next` (reference equality + consecutive dedup). */
export function shouldRecordEvent(
  prev: GameState,
  next: GameState,
  action: GameAction,
  lastEntry: EventEntry | undefined
): boolean {
  if (next === prev) return false
  const fingerprint = decisionEventFingerprint(action)
  if (fingerprint && lastEntry && decisionEventFingerprint(lastEntry.a) === fingerprint) {
    return false
  }
  return true
}

/**
 * Actions recorded into the event log. Everything in GameAction except undo
 * (a branch operation on the save document, never a log entry).
 */
export const REPLAYABLE_ACTIONS: ReadonlySet<GameAction['type']> = new Set([
  'END_TURN',
  'PLAY_CARD',
  'DEPLOY_TROOP',
  'UNDEPLOY_TROOP',
  'RETREAT_TROOP',
  'PLAY_INTRIGUE',
  'MOBILIZE_GARRISON',
  'ACQUIRE_CARD',
  'PLAY_COMBAT_INTRIGUE',
  'RESOLVE_COMBAT',
  'RESOLVE_CONFLICT_REWARD_CHOICE',
  'START_COMBAT_PHASE',
  'PASS_COMBAT',
  'PLACE_AGENT',
  'REVEAL_CARDS',
  'ACQUIRE_AL',
  'ACQUIRE_SMF',
  'PAY_COST',
  'RESOLVE_CHOICE',
  'RESOLVE_CARD_SELECT',
  'CUSTOM_EFFECT',
  'TRASH_CARD',
  'SELECT_CONFLICT',
  'CLAIM_REWARD',
  'CLAIM_ALL_REWARDS',
  'RESET_IMPERIUM_ROW',
  'SELECT_IMPERIUM_REPLACEMENT',
  'OPPONENT_DISCARD_CHOICE',
  'OPPONENT_DISCARD_CARD',
  'OPPONENT_DISCARD_CARDS',
  'OPPONENT_NO_CARD_ACK',
  'RESOLVE_ENDGAME',
  'REVEAL_ENDGAME_INTRIGUE',
  'SANDBOX_COMMIT_SETUP',
  'SANDBOX_SET_CONFLICT',
  'SANDBOX_SET_IMPERIUM_ROW',
  'SANDBOX_UPDATE_PLAYER',
  'SANDBOX_SET_CONTROL_MARKER',
  'SANDBOX_SET_POSITION',
] satisfies Array<GameAction['type']>)

export function isReplayable(action: GameAction): boolean {
  return REPLAYABLE_ACTIONS.has(action.type)
}

export function computeChecksum(state: GameState, playerId: number): PlayerChecksum {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return [0, 0, 0, 0, 0]
  return [player.spice, player.solari, player.water, player.troops, player.victoryPoints]
}

/** Throws when a value contains functions, Sets/Maps, or other non-JSON data. */
export function assertJsonSerializable(value: unknown, label: string, path = '$'): void {
  if (value === null) return
  const t = typeof value
  if (t === 'string' || t === 'boolean') return
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new Error(`Non-serializable action payload: ${label} at ${path} (non-finite number)`)
    }
    return
  }
  if (t === 'undefined') return // dropped by JSON, harmless for optional fields
  if (t === 'object') {
    if (value instanceof Set || value instanceof Map || value instanceof Date) {
      throw new Error(`Non-serializable action payload: ${label} at ${path} (${value.constructor.name})`)
    }
    if (Array.isArray(value)) {
      value.forEach((entry, i) => assertJsonSerializable(entry, label, `${path}[${i}]`))
      return
    }
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      assertJsonSerializable(entry, label, `${path}.${key}`)
    }
    return
  }
  // function, symbol, bigint
  throw new Error(`Non-serializable action payload: ${label} at ${path} (${t})`)
}
