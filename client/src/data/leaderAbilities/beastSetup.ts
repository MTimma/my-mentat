import { Leader } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export function getStartingSpice(leader: Leader): number {
  return leader.name === LEADER_NAMES.BEAST_RABBAN ? 1 : 0
}

export function getStartingSolari(leader: Leader): number {
  return leader.name === LEADER_NAMES.BEAST_RABBAN ? 1 : 0
}

/** Apply the delta between two leaders' starting resource bonuses (sandbox leader swap). */
export function applyLeaderStartingResourceDelta(
  player: { spice: number; solari: number; leader: Leader },
  nextLeader: Leader
): { spice: number; solari: number } {
  const spiceDelta = getStartingSpice(nextLeader) - getStartingSpice(player.leader)
  const solariDelta = getStartingSolari(nextLeader) - getStartingSolari(player.leader)
  return {
    spice: Math.max(0, player.spice + spiceDelta),
    solari: Math.max(0, player.solari + solariDelta),
  }
}
