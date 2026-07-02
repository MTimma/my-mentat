import { describe, expect, it } from 'vitest'
import type { PendingReward } from '../../types/GameTypes'
import { GainSource } from '../../types/GameTypes'
import { isSoleTrashThisCardReward } from '../pendingRewardAutoApply'

function trashReward(sourceId: number, sourceName: string): PendingReward {
  return {
    id: `trash-${sourceId}`,
    source: { type: GainSource.CARD, id: sourceId, name: sourceName },
    reward: { trashThisCard: true },
    isTrash: true,
  }
}

function drawReward(sourceId: number, sourceName: string): PendingReward {
  return {
    id: `draw-${sourceId}`,
    source: { type: GainSource.CARD, id: sourceId, name: sourceName },
    reward: { drawCards: 1 },
    isTrash: false,
  }
}

describe('isSoleTrashThisCardReward', () => {
  it('is true when trashThisCard is the only pending reward from its source', () => {
    const seekAlliesTrash = trashReward(9, 'Seek Allies')
    const rewards = [seekAlliesTrash]
    expect(isSoleTrashThisCardReward(rewards, seekAlliesTrash)).toBe(true)
  })

  it('is false when the same source has another pending reward', () => {
    const powerPlayTrash = trashReward(1040, 'Power Play')
    const powerPlayCustom: PendingReward = {
      id: 'pp-custom',
      source: { type: GainSource.CARD, id: 1040, name: 'Power Play' },
      reward: { custom: 'POWER_PLAY' as never },
      isTrash: false,
    }
    const rewards = [powerPlayCustom, powerPlayTrash]
    expect(isSoleTrashThisCardReward(rewards, powerPlayTrash)).toBe(false)
  })

  it('is false for generic pick-a-card trash rewards', () => {
    const genericTrash: PendingReward = {
      id: 'generic-trash',
      source: { type: GainSource.CARD, id: 1, name: 'Source' },
      reward: { trash: 1 },
      isTrash: true,
    }
    expect(isSoleTrashThisCardReward([genericTrash], genericTrash)).toBe(false)
  })

  it('is false when trashThisCard shares a source with drawCards', () => {
    const foldspaceTrash = trashReward(401, 'Foldspace')
    const rewards = [drawReward(401, 'Foldspace'), foldspaceTrash]
    expect(isSoleTrashThisCardReward(rewards, foldspaceTrash)).toBe(false)
  })
})
