import type { Player } from '../types/GameTypes'

/**
 * Maps High Council seat slots (left→right) to player ids.
 * Fills from `highCouncilSeatOrder` (chronological first visit); players who still
 * have `hasHighCouncilSeat`. Anyone with a seat missing from order (legacy state)
 * fills empty slots by ascending player id.
 */
export function highCouncilSlotAssignments(
  players: Player[],
  seatOrder: number[] | undefined
): (number | null)[] {
  const slots: (number | null)[] = [null, null, null, null]
  const order = seatOrder ?? []
  let idx = 0
  for (const pid of order) {
    if (idx >= 4) break
    const p = players.find(pl => pl.id === pid)
    if (p?.hasHighCouncilSeat) {
      slots[idx++] = pid
    }
  }
  const seated = new Set(
    players.filter(p => p.hasHighCouncilSeat).map(p => p.id)
  )
  for (const pid of [...seated].sort((a, b) => a - b)) {
    if (slots.includes(pid)) continue
    const empty = slots.findIndex(s => s === null)
    if (empty >= 0) slots[empty] = pid
  }
  return slots
}
