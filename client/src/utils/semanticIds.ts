/**
 * Deterministic semantic ids for pending choices / rewards / optional effects
 * (plans/reducer/02-deterministic-ids.md).
 *
 * Grammar: `<sourceType>-<sourceId>-<kind>[-<occurrence>]`
 * - sourceType: GainSource value (kebab-case) or 'conflict'.
 * - sourceId:   numeric catalog/instance id of the source.
 * - kind:       OR | INFLUENCE-GAIN | INFLUENCE-LOSE | ACQUIRE | TRASH |
 *               CARD-SELECT | REWARD | EFFECT | ... (published in
 *               public/catalogs/choice-ids.v1.json).
 * - occurrence: 0-based counter scoped to identical (source, kind) ids among
 *               the LIVE entries passed in; omitted when 0.
 *
 * Replacing crypto.randomUUID() with these ids makes the reducer a pure
 * deterministic function: replaying a recorded action log re-mints identical
 * ids, so recorded RESOLVE_CHOICE / CLAIM_REWARD / PAY_COST events resolve.
 * External producers can compute ids without simulating the engine.
 */
import type { GameState, GameTurn } from '../types/GameTypes'

export interface SemanticIdSource {
  /** GainSource value or 'conflict'. */
  type: string
  id: number | string
}

/** Build the base id (no occurrence suffix). */
export function semanticIdBase(source: SemanticIdSource, kind: string): string {
  return `${source.type}-${source.id}-${kind}`
}

/**
 * Mint the next id for (source, kind), unique among `existingIds`.
 * Counts ids equal to the base or `base-<n>`; returns `base` when none exist.
 */
export function nextSemanticId(
  source: SemanticIdSource,
  kind: string,
  existingIds: Iterable<string>
): string {
  const base = semanticIdBase(source, kind)
  // Dedupe exact ids: callers may pass overlapping collections (state + local
  // under-construction arrays); identical id strings are one live entry.
  const unique = new Set(existingIds)
  let count = 0
  for (const id of unique) {
    if (id === base) {
      count++
      continue
    }
    if (id.startsWith(base + '-')) {
      const suffix = id.slice(base.length + 1)
      if (/^\d+$/.test(suffix)) count++
    }
  }
  return count === 0 ? base : `${base}-${count}`
}

/**
 * All live pending ids in the state (pending rewards, choices, optional
 * effects, conflict reward choices). Pass `extra` for ids of entries being
 * built in the same reducer case that are not yet in the state.
 */
export function collectLiveIds(
  state: Pick<GameState, 'pendingRewards' | 'pendingConflictRewardChoices'> & {
    currTurn?: GameTurn | null
  },
  extra: Iterable<string> = []
): string[] {
  const ids: string[] = []
  for (const reward of state.pendingRewards ?? []) ids.push(reward.id)
  for (const choice of state.currTurn?.pendingChoices ?? []) ids.push(choice.id)
  for (const effect of state.currTurn?.optionalEffects ?? []) ids.push(effect.id)
  for (const choice of state.pendingConflictRewardChoices ?? []) ids.push(choice.id)
  for (const id of extra) ids.push(id)
  return ids
}

/** Convenience: mint an id unique across the state's live ids plus `extra`. */
export function mintId(
  state: Pick<GameState, 'pendingRewards' | 'pendingConflictRewardChoices'> & {
    currTurn?: GameTurn | null
  },
  source: SemanticIdSource,
  kind: string,
  extra: Iterable<string> = []
): string {
  return nextSemanticId(source, kind, collectLiveIds(state, extra))
}
