import { Leader, Player } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export function isHudroLeader(leader: Leader): boolean {
  return leader.name === LEADER_NAMES.VISCOUNT_HUDRO_MORITANI
}

/** Simplified setup: +1 intrigue once per game (peek paraphrased). */
export function applyHudroStartingIntrigue(player: Player): Player {
  if (!isHudroLeader(player.leader)) return player
  if (player.leader.hudroPeekUsed) return player
  return {
    ...player,
    intrigueCount: player.intrigueCount + 1,
    leader: { ...player.leader, hudroPeekUsed: true },
  }
}

export function hudroPeekAvailable(leader: Leader): boolean {
  return isHudroLeader(leader) && !leader.hudroPeekUsed
}

export function consumeHudroPeek(leader: Leader): Leader {
  if (!isHudroLeader(leader)) return leader
  return { ...leader, hudroPeekUsed: true }
}
