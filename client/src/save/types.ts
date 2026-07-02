/**
 * Event-sourced save document (plans/reducer/01-save-format.md).
 *
 * The save format is the action log: `setup` (catalog ids) + append-only
 * `events` trunk + `branches` (undo/what-if never rewrites the trunk) +
 * cached `summary` for list views. Kept UI-free and JSON-plain so it can be
 * mirrored by serde structs in the Rust engine later.
 */
import type { GameAction } from '../components/GameContext/GameContext'
import type { Expansions, PlayerColor } from '../types/GameTypes'

export const SAVE_SCHEMA_VERSION = 1

/** Per-player resource checksum recorded on END_TURN: [spice, solari, water, troops, vp]. */
export type PlayerChecksum = [number, number, number, number, number]

/** Optional debug context stamped at record time (ignored by replay). */
export interface EventRecordContext {
  /** Round number when the action was recorded (1-based). */
  round: number
  /** Active player when the action was recorded. */
  activePlayerId: number
  /** Player-turn sequence: 1 + completed END_TURN events before this one. */
  turn: number
}

export interface EventEntry {
  /** The recorded action (decision), exactly as dispatched. */
  a: GameAction
  /** Optional divergence checksums, keyed `p<playerId>`, written on END_TURN. */
  ck?: Record<string, PlayerChecksum>
  /** Debug context (round / turn / active player); not used by replay. */
  ctx?: EventRecordContext
}

export interface PlayerSetupBlock {
  id: number
  /** Catalog leader id (slug, e.g. "paul") — see public/catalogs/leaders.v1.json. */
  leaderId: string
  color: PlayerColor
  /** Catalog card ids (pool/slug), ordered; duplicates allowed for copies. */
  deckCardIds: string[]
  /** Starting resources when set in game-creation UI (omitted = leader defaults). */
  startingResources?: {
    spice?: number
    water?: number
    solari?: number
    troops?: number
    victoryPoints?: number
  }
}

export interface SetupBlock {
  firstPlayer: number
  players: PlayerSetupBlock[]
  /** Canonical game pack ref (e.g. official/base+riseOfIx@1). Required for new games. */
  gamePackId?: string
  /** Catalog dataset version; default from game pack when omitted. */
  catalogVersion?: number
  /** Starting round when not 1 (game-creation UI). */
  currentRound?: number
  /** Catalog card ids for the initial imperium row (length 5); optional. */
  imperiumRowCardIds?: string[]
  /** Catalog card ids for the imperium deck order; omitted = authored order. */
  imperiumRowDeckCardIds?: string[]
  /** Conflict catalog id revealed for round 1; optional (sandbox may set later). */
  initialConflictId?: number
  /** Sandbox games start in setup mode (SANDBOX_* events configure the board). */
  sandbox?: boolean
  /**
   * Expansion flags — derived from gamePackId at hydrate time for new games.
   * Legacy saves may only have this field; infer gamePackId on load.
   */
  expansions?: Expansions
}

export interface SaveBranch {
  id: string
  /** 'trunk' or another branch id. */
  parent: string
  /** Index into the parent's events where this branch forks. */
  forkAtEvent: number
  label?: string
  createdAt: string
  events: EventEntry[]
}

export interface SaveCursor {
  branch: string
  event: number
}

export interface SaveMeta {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  appVersion?: string
  notes?: string
}

export interface SaveSummary {
  rounds: number
  winner: number | null
  finalVp: Record<number, number>
  players: Array<{ id: number; leaderId: string; color: PlayerColor }>
  eventCount: number
}

export interface SaveDoc {
  schemaVersion: number
  meta: SaveMeta
  setup: SetupBlock
  /** Trunk — append-only; undo forks a branch instead of rewriting. */
  events: EventEntry[]
  branches: SaveBranch[]
  cursor: SaveCursor
  summary?: SaveSummary
}

export interface ReplayDivergence {
  eventIndex: number
  playerId: number
  expected: PlayerChecksum
  actual: PlayerChecksum
}
