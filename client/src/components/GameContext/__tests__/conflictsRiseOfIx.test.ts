import { describe, expect, it } from 'vitest'
import {
  RISE_OF_IX_CONFLICTS,
  RISE_OF_IX_CONFLICT_CARD_IMAGE_FILE,
} from '../../../data/conflictsRiseOfIx'
import { getConflictPool } from '../../../data/conflicts'
import { RewardType, NO_EXPANSIONS } from '../../../types/GameTypes'

const ROI = { ...NO_EXPANSIONS, riseOfIx: true }

describe('Rise of Ix conflict cards — data', () => {
  it('defines exactly 4 RoI conflicts (ids 919–922)', () => {
    expect(RISE_OF_IX_CONFLICTS).toHaveLength(4)
    expect(RISE_OF_IX_CONFLICTS.map(c => c.id)).toEqual([919, 920, 921, 922])
  })

  it('every RoI conflict has image mapping', () => {
    for (const c of RISE_OF_IX_CONFLICTS) {
      expect(RISE_OF_IX_CONFLICT_CARD_IMAGE_FILE[c.id]).toMatch(/^rise_of_ix\/.+\.png$/)
    }
  })

  it('Skirmish IV/V are tier 1 with freighter first-place rewards', () => {
    const skirmishIv = RISE_OF_IX_CONFLICTS.find(c => c.id === 919)!
    const skirmishV = RISE_OF_IX_CONFLICTS.find(c => c.id === 920)!
    expect(skirmishIv.tier).toBe(1)
    expect(skirmishV.tier).toBe(1)
    expect(skirmishIv.rewards.first.some(r => r.type === RewardType.FREIGHTER)).toBe(true)
    expect(skirmishV.rewards.first.some(r => r.type === RewardType.FREIGHTER)).toBe(true)
  })

  it('Economy Supremacy tier 3 first place includes VP choice options', () => {
    const econ = RISE_OF_IX_CONFLICTS.find(c => c.id === 921)!
    expect(econ.tier).toBe(3)
    const vpChoice = econ.rewards.first.find(r => r.choiceOptions != null)
    expect(vpChoice?.choiceOptions?.some(o => o.type === RewardType.TECH)).toBe(true)
  })

  it('Trade Monopoly tier 2 grants 2 freighter on first place', () => {
    const trade = RISE_OF_IX_CONFLICTS.find(c => c.id === 922)!
    expect(trade.tier).toBe(2)
    const freighterRewards = trade.rewards.first.filter(r => r.type === RewardType.FREIGHTER)
    expect(freighterRewards.reduce((n, r) => n + (r.amount ?? 0), 0)).toBe(2)
  })

  it('conflict pool length is 22 when RoI enabled (18 base + 4 RoI)', () => {
    const pool = getConflictPool(ROI)
    expect(pool).toHaveLength(22)
    for (const roi of RISE_OF_IX_CONFLICTS) {
      expect(pool.some(c => c.id === roi.id)).toBe(true)
    }
  })

  it('conflict pool stays 18 without RoI', () => {
    expect(getConflictPool(NO_EXPANSIONS)).toHaveLength(18)
  })
})
