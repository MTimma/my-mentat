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

/** Positional podium slot. 1 = rightmost. Independent of reward `place` on ties. */
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

function emptySlots(): CombatRankSlot[] {
  return Array.from({ length: COMBAT_RANK_SLOT_COUNT }, (_, i) => ({
    slotPlace: (COMBAT_RANK_SLOT_COUNT - i) as CombatRankSlotPlace,
    entry: null,
  }))
}

function packRightAligned(entries: CombatRankEntry[]): CombatRankSlot[] {
  const occupied = entries.slice(-COMBAT_RANK_SLOT_COUNT)
  const pad = COMBAT_RANK_SLOT_COUNT - occupied.length
  return emptySlots().map((slot, i) => {
    const entryIndex = i - pad
    return {
      ...slot,
      entry: entryIndex >= 0 ? occupied[entryIndex] ?? null : null,
    }
  })
}

/**
 * In-combat players only (≥1 troop or dreadnought). Sorted strength ascending
 * (left → right) so the strongest sit rightmost. Ties drop one reward place;
 * id breaks left/right order.
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
 * Constant 4-position frame. Players sit in the slot matching their reward
 * place (ties spill left). If that would overflow, pack right-aligned.
 */
export function buildCombatRankSlots(args: CombatRankArgs): CombatRankSlot[] {
  const entries = buildCombatRankEntries(args)
  if (entries.length === 0) return emptySlots()

  const slots = emptySlots()
  // Higher id first among a tied group so lower id ends up further left when spilling.
  const placeOrder = [...entries].sort(
    (a, b) => b.strength - a.strength || b.player.id - a.player.id
  )

  const unplaced: CombatRankEntry[] = []
  for (const entry of placeOrder) {
    const place = Math.min(Math.max(entry.place, 1), COMBAT_RANK_SLOT_COUNT)
    let i = COMBAT_RANK_SLOT_COUNT - place
    while (i >= 0 && slots[i].entry) i -= 1
    if (i >= 0) slots[i].entry = entry
    else unplaced.push(entry)
  }

  if (unplaced.length > 0) return omitUnclaimedFirstSlot(packRightAligned(entries))
  return omitUnclaimedFirstSlot(slots)
}

/** No unique winner: drop the vacant gold 1 box. */
function omitUnclaimedFirstSlot(slots: CombatRankSlot[]): CombatRankSlot[] {
  if (slots.some(slot => slot.entry?.place === 1)) return slots
  if (!slots.some(slot => slot.entry != null)) return slots
  return slots.filter(slot => !(slot.slotPlace === 1 && slot.entry == null))
}
