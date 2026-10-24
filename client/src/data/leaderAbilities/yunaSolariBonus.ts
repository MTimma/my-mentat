import {
  GamePhase,
  GainSource,
  RewardType,
  type Gain,
  type GameState,
  type Leader,
  type PendingReward,
  type Player,
} from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export const YUNA_SOLARI_BONUS_GAIN_NAME = 'Smuggling Operation'

export function isYunaLeader(leader: Leader): boolean {
  return leader.name === LEADER_NAMES.PRINCESS_YUNA_MORITANI
}

export function getStartingWater(leader: Leader): number {
  return isYunaLeader(leader) ? 0 : 1
}

/**
 * Smuggling Operation: +1 whenever Yuna gains Solari during her Agent or Reveal turn.
 * Player Turns only — not Round Start, Combat, Makers, Recall, or Endgame.
 */
export function shouldGrantYunaSolariBonus(
  state: GameState,
  player: Player,
  reward: PendingReward['reward']
): boolean {
  if (state.phase !== GamePhase.PLAYER_TURNS) return false
  if (!isYunaLeader(player.leader)) return false
  if (state.activePlayerId !== player.id) return false
  if (!reward.solari || reward.solari <= 0) return false
  return true
}

/** Apply +1 solari when Yuna gains solari on her own turn. */
export function applyYunaSolariBonus(solari: number): number {
  return solari + 1
}

/** Push the +1 Smuggling Operation gain. Returns 1 when granted, otherwise 0. */
export function pushYunaSolariBonus(
  state: GameState,
  player: Player,
  baseSolari: number,
  gains: Gain[]
): number {
  if (!shouldGrantYunaSolariBonus(state, player, { solari: baseSolari })) return 0
  gains.push({
    round: state.currentRound,
    playerId: player.id,
    sourceId: 0,
    name: YUNA_SOLARI_BONUS_GAIN_NAME,
    amount: 1,
    type: RewardType.SOLARI,
    source: GainSource.LEADER_ABILITY,
  })
  return 1
}
