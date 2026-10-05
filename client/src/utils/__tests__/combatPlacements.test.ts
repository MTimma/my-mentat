import { describe, expect, it } from 'vitest'
import { combatRewardPlace } from '../combatPlacements'

describe('combatRewardPlace', () => {
  it('keeps unique ranks', () => {
    const field = [10, 6, 4, 2]
    expect(combatRewardPlace(10, field)).toBe(1)
    expect(combatRewardPlace(6, field)).toBe(2)
    expect(combatRewardPlace(4, field)).toBe(3)
    expect(combatRewardPlace(2, field)).toBe(4)
  })

  it('drops a first-place tie to 2nd; remaining compete for 3rd', () => {
    const field = [8, 8, 4, 2]
    expect(combatRewardPlace(8, field)).toBe(2)
    expect(combatRewardPlace(4, field)).toBe(3)
    expect(combatRewardPlace(2, field)).toBe(4)
  })

  it('drops a second-place tie to 3rd', () => {
    const field = [10, 6, 6, 2]
    expect(combatRewardPlace(10, field)).toBe(1)
    expect(combatRewardPlace(6, field)).toBe(3)
    expect(combatRewardPlace(2, field)).toBe(4)
  })

  it('after a first-place tie, a remaining tie for 3rd gets nothing', () => {
    const field = [8, 8, 4, 4]
    expect(combatRewardPlace(8, field)).toBe(2)
    expect(combatRewardPlace(4, field)).toBe(4)
  })

  it('unique 1st and 2nd: a remaining tie for 3rd gets nothing', () => {
    const field = [10, 6, 2, 2]
    expect(combatRewardPlace(10, field)).toBe(1)
    expect(combatRewardPlace(6, field)).toBe(2)
    expect(combatRewardPlace(2, field)).toBe(4)
  })

  it('after a first-place tie, a unique remaining player gets 3rd', () => {
    const field = [8, 8, 4, 2]
    expect(combatRewardPlace(8, field)).toBe(2)
    expect(combatRewardPlace(4, field)).toBe(3)
    expect(combatRewardPlace(2, field)).toBe(4)
  })
})
