import type { Expansions, Player, SpaceProps } from '../types/GameTypes'
import {
  disabledBaseSpaceIdsForExpansions,
  RISE_OF_IX_DISABLED_BASE_SPACE_IDS,
} from './expansionBoardHotspots'

export { RISE_OF_IX_DISABLED_BASE_SPACE_IDS }

export function isBoardSpaceAvailableForExpansions(
  space: SpaceProps,
  expansions: Expansions
): boolean {
  if (space.riseOfIx) {
    return Boolean(expansions.riseOfIx)
  }
  if (disabledBaseSpaceIdsForExpansions(expansions).has(space.id)) {
    return false
  }
  return true
}

/** High Council and Swordmaster — once per game per player (official rules). */
export function canPlayerVisitBoardSpaceOnce(space: SpaceProps, player: Player): boolean {
  if (space.specialEffect === 'highCouncil' && player.hasHighCouncilSeat) {
    return false
  }
  if (space.specialEffect === 'swordmaster' && player.hasSwordmaster) {
    return false
  }
  return true
}

/** Mentat token sits on the Landsraad space when no player currently holds it. */
export function isMentatAvailableOnBoard(mentatOwner: number | null): boolean {
  return mentatOwner === null
}

/** Players who may still send an Agent to Swordmaster (once per game). */
export function playersEligibleForSwordmaster(players: Player[]): Player[] {
  return [...players].filter(p => !p.hasSwordmaster).sort((a, b) => a.id - b.id)
}
