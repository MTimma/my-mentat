import type { Player } from '../types/GameTypes'
import { combatRewardPlace } from './combatPlacements'
import { getDreadnoughtsInConflict } from './dreadnoughts'

export const COMBAT_RANK_SLOT_COUNT = 4

export type CombatRankEntry = {
  player: Player
  troops: number
  dreadnoughts: number
  strength: number
  /** Reward place after ties drop one rank. 1 = unique first; 4 = no reward. */
  place: number
}

/** Positional podium slot. 1 is the top of the board column. */
export type CombatRankSlotPlace = 1 | 2 | 3 | 4

export type CombatRankSlot = {
  slotPlace: CombatRankSlotPlace
  /** Everyone who shares this reward place. Empty = shadow box. */
  entries: CombatRankEntry[]
}

type CombatRankArgs = {
  players: Player[]
  troops: Record<number, number>
  strength: Record<number, number>
  riseOfIx?: boolean
}

function emptySlots(): CombatRankSlot[] {
  return Array.from({ length: COMBAT_RANK_SLOT_COUNT }, (_, i) => ({
    slotPlace: (COMBAT_RANK_SLOT_COUNT - i) as CombatRankSlotPlace,
    entries: [],
  }))
}

/**
 * In-combat players only (≥1 troop or dreadnought). Sorted strength ascending
 * so the strongest sit in the higher slot. Ties drop one reward place;
 * lower player id comes first inside a tied group.
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

  const fieldStrengths = inCombat.map(player => strength[player.id] ?? 0)

  return sorted.map(player => {
    const s = strength[player.id] ?? 0
    return {
      player,
      troops: troops[player.id] ?? 0,
      dreadnoughts: riseOfIx ? getDreadnoughtsInConflict(player) : 0,
      strength: s,
      place: combatRewardPlace(s, fieldStrengths),
    }
  })
}

/**
 * Always 4 slots, including when nobody has deployed.
 * Each player goes in the slot for their reward place. A tie shares that one
 * box; the rank the tie skipped stays an empty shadow above them.
 * Lower player id is first inside a tied box (display order, not a rulebook layout).
 */
export function buildCombatRankSlots(args: CombatRankArgs): CombatRankSlot[] {
  const slots = emptySlots()
  for (const entry of buildCombatRankEntries(args)) {
    const place = Math.min(Math.max(entry.place, 1), COMBAT_RANK_SLOT_COUNT)
    const index = COMBAT_RANK_SLOT_COUNT - place
    slots[index]?.entries.push(entry)
  }
  for (const slot of slots) {
    slot.entries.sort((a, b) => a.player.id - b.player.id)
  }
  return slots
}
