import { Leader } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'
import { getStartingIntrigue } from './hudroSetup'
import { getStartingWater } from './yunaSolariBonus'

export function getStartingSpice(leader: Leader): number {
  return leader.name === LEADER_NAMES.BEAST_RABBAN ? 1 : 0
}

export function getStartingSolari(leader: Leader): number {
  return leader.name === LEADER_NAMES.BEAST_RABBAN ? 1 : 0
}

/** Apply the delta between two leaders' starting resource bonuses (sandbox leader swap). */
export function applyLeaderStartingResourceDelta(
  player: { spice: number; solari: number; water: number; intrigueCount: number; leader: Leader },
  nextLeader: Leader
): { spice: number; solari: number; water: number; intrigueCount: number } {
  const spiceDelta = getStartingSpice(nextLeader) - getStartingSpice(player.leader)
  const solariDelta = getStartingSolari(nextLeader) - getStartingSolari(player.leader)
  const waterDelta = getStartingWater(nextLeader) - getStartingWater(player.leader)
  const intrigueDelta = getStartingIntrigue(nextLeader) - getStartingIntrigue(player.leader)
  return {
    spice: Math.max(0, player.spice + spiceDelta),
    solari: Math.max(0, player.solari + solariDelta),
    water: Math.max(0, player.water + waterDelta),
    intrigueCount: Math.max(0, player.intrigueCount + intrigueDelta),
  }
}
