import type { PendingReward } from '../types/GameTypes'

export function activePendingRewardsFromSource(
  rewards: readonly PendingReward[],
  source: Pick<PendingReward['source'], 'type' | 'id'>
): PendingReward[] {
  return rewards.filter(
    r => !r.disabled && r.source.type === source.type && r.source.id === source.id
  )
}

function isTrashThisCardOnly(reward: PendingReward['reward']): boolean {
  if (!reward.trashThisCard) return false
  return Object.entries(reward).every(
    ([key, value]) => key === 'trashThisCard' || value === undefined
  )
}

/** trashThisCard is mandatory and auto-applies only when it is the sole pending reward from its source. */
export function isSoleTrashThisCardReward(
  rewards: readonly PendingReward[],
  reward: PendingReward
): boolean {
  if (!reward.isTrash || !isTrashThisCardOnly(reward.reward)) return false
  return activePendingRewardsFromSource(rewards, reward.source).length === 1
}
