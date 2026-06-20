import { GameState, Leader, PendingReward, Player } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export function isYunaLeader(leader: Leader): boolean {
  return leader.name === LEADER_NAMES.PRINCESS_YUNA_MORITANI
}

export function getStartingWater(leader: Leader): number {
  return isYunaLeader(leader) ? 0 : 1
}

export function shouldGrantYunaSolariBonus(
  state: GameState,
  player: Player,
  reward: PendingReward['reward']
): boolean {
  if (!isYunaLeader(player.leader)) return false
  if (state.activePlayerId !== player.id) return false
  if (!reward.solari || reward.solari <= 0) return false
  return true
}

/** Apply +1 solari when Yuna gains solari on her own turn. */
export function applyYunaSolariBonus(solari: number): number {
  return solari + 1
}
