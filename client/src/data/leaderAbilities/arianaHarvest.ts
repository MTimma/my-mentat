import { Player, PendingReward, Reward, GainSource } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'
import { BOARD_SPACES } from '../boardSpaces'

export function isArianaHarvestReward(player: Player, reward: PendingReward): boolean {
  if (player.leader.name !== LEADER_NAMES.COUNTESS_ARIANA_THORVALD) return false
  if (reward.source.type !== GainSource.BOARD_SPACE) return false
  if (!reward.reward.spice) return false
  const space = BOARD_SPACES.find(s => s.id === reward.source.id)
  return Boolean(space?.makerSpace)
}

export function getArianaAdjustedReward(reward: PendingReward): Reward {
  return {
    ...reward.reward,
    spice: (reward.reward.spice ?? 0) - 1,
    drawCards: (reward.reward.drawCards ?? 0) + 1,
  }
}
