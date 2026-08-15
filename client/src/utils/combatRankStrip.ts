import type { Player } from '../types/GameTypes'
import { getDreadnoughtsInConflict } from './dreadnoughts'

export const COMBAT_RANK_SLOT_COUNT = 4

export type CombatRankEntry = {
  player: Player
  troops: number
  dreadnoughts: number
  strength: number
  /** Competition place: 1 = highest strength. Ties share the same place. */
  place: number
}

/** Positional podium slot. 1 = rightmost. Independent of competition `place` on ties. */
export type CombatRankSlotPlace = 1 | 2 | 3 | 4

export type CombatRankSlot = {
  slotPlace: CombatRankSlotPlace
  entry: CombatRankEntry | null
}

type CombatRankArgs = {
  players: Player[]
  troops: Record<number, number>
  strength: Record<number, number>
  riseOfIx?: boolean
}

/**
 * In-combat players only (≥1 troop or dreadnought). Sorted strength ascending
 * (left → right) so place 1 is rightmost. Ties share place; id breaks left/right order.
 */
export function buildCombatRankEntries({
  players,
  troops,
  strength,
  riseOfIx = false,
}: CombatRankArgs): CombatRankEntry[] {
  const inCombat = players.filter(player => {
    const troopCount = troops[player.id] ?? 0
    const dreadCount = riseOfIx ? getDreadnoughtsInConflict(player) : 0
    return troopCount >= 1 || dreadCount >= 1
  })

  if (inCombat.length === 0) return []

  const sorted = [...inCombat].sort((a, b) => {
    const sa = strength[a.id] ?? 0
    const sb = strength[b.id] ?? 0
    if (sa !== sb) return sa - sb
    return a.id - b.id
  })

  return sorted.map(player => {
    const s = strength[player.id] ?? 0
    const higherCount = inCombat.filter(p => (strength[p.id] ?? 0) > s).length
    return {
      player,
      troops: troops[player.id] ?? 0,
      dreadnoughts: riseOfIx ? getDreadnoughtsInConflict(player) : 0,
      strength: s,
      place: higherCount + 1,
    }
  })
}

/**
 * Constant 4-position frame. Occupied entries are right-aligned (highest strength
 * in slot 1). Empty slots pad the left. Slot labels are positional 4–1.
 */
export function buildCombatRankSlots(args: CombatRankArgs): CombatRankSlot[] {
  const entries = buildCombatRankEntries(args)
  const occupied = entries.slice(-COMBAT_RANK_SLOT_COUNT)
  const pad = COMBAT_RANK_SLOT_COUNT - occupied.length
  return Array.from({ length: COMBAT_RANK_SLOT_COUNT }, (_, i) => {
    const slotPlace = (COMBAT_RANK_SLOT_COUNT - i) as CombatRankSlotPlace
    const entryIndex = i - pad
    return {
      slotPlace,
      entry: entryIndex >= 0 ? occupied[entryIndex] ?? null : null,
    }
  })
}
