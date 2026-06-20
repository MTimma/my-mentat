import type { ControlMarkerType, Expansions, GameState, Player } from '../types/GameTypes'

export interface PlayerDreadnoughts {
  supply: number
  garrison: number
  conflict: number
  control: Array<{ space: ControlMarkerType; placedRound: number }>
}

export const DEFAULT_DREADNOUGHTS: PlayerDreadnoughts = {
  supply: 2,
  garrison: 0,
  conflict: 0,
  control: [],
}

export function defaultDreadnoughtsForExpansions(
  expansions: Expansions
): PlayerDreadnoughts | undefined {
  return expansions.riseOfIx ? { ...DEFAULT_DREADNOUGHTS, control: [] } : undefined
}

export function getActiveDreadnoughtCount(d: PlayerDreadnoughts): number {
  return d.garrison + d.conflict + d.control.length
}

/** How many dreadnoughts can be commissioned (cap 2 active, limited by supply). */
export function getCommissionableCount(player: Player, requested: number): number {
  const d = player.dreadnoughts
  if (!d || requested <= 0) return 0
  const cap = 2 - getActiveDreadnoughtCount(d)
  return Math.max(0, Math.min(requested, d.supply, cap))
}

/** Who receives the control-space bonus (dreadnought cover overrides marker owner). */
export function controlBonusOwner(
  state: GameState,
  space: ControlMarkerType
): number | null {
  const cover = state.dreadnoughtCover?.[space]
  if (cover != null) return cover
  return state.controlMarkers[space] ?? null
}

/** True when the player has troops or (RoI) dreadnoughts/negotiators in the Conflict. */
export function playerHasUnitsInCombat(state: GameState, playerId: number): boolean {
  if ((state.combatTroops[playerId] || 0) > 0) return true
  if ((state.combatNegotiators?.[playerId] || 0) > 0) return true
  if (state.expansions?.riseOfIx !== true) return false
  const player = state.players.find(p => p.id === playerId)
  return (player?.dreadnoughts?.conflict ?? 0) > 0
}

export function getDreadnoughtsInConflict(player: Player): number {
  return player.dreadnoughts?.conflict ?? 0
}

/** Troops + dreadnoughts + negotiators currently in the Conflict for this player. */
export function unitsInConflictForPlayer(state: GameState, playerId: number): number {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return 0
  return (
    (state.combatTroops?.[playerId] ?? 0) +
    (state.combatNegotiators?.[playerId] ?? 0) +
    (player.dreadnoughts?.conflict ?? 0)
  )
}

/** Troops + dreadnoughts in garrison (not in Conflict or on control spaces). */
export function unitsInGarrison(player: Player): number {
  return player.troops + (player.dreadnoughts?.garrison ?? 0)
}
