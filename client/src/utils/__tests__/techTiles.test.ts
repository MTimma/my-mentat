import { describe, expect, it } from 'vitest'
import { canPlayerAffordTechTile } from '../techTiles'

describe('canPlayerAffordTechTile', () => {
  it('dims only unaffordable tiles: full spice cost without acquire reward', () => {
    const player = { spice: 3, solari: 0, negotiatorsOnIx: 0 }
    expect(canPlayerAffordTechTile(player, 2)).toBe(true)
    expect(canPlayerAffordTechTile(player, 3)).toBe(true)
    expect(canPlayerAffordTechTile(player, 5)).toBe(false)
  })

  it('treats zero spice as unaffordable for any paid tile', () => {
    const player = { spice: 0, solari: 10, negotiatorsOnIx: 0 }
    expect(canPlayerAffordTechTile(player, 2)).toBe(false)
    expect(canPlayerAffordTechTile(player, 0)).toBe(true)
  })

  it('applies acquire discount when reward is active', () => {
    const player = { spice: 3, solari: 0, negotiatorsOnIx: 0 }
    expect(canPlayerAffordTechTile(player, 5, { discount: 2 })).toBe(true)
    expect(canPlayerAffordTechTile(player, 5, { discount: 1 })).toBe(false)
  })

  it('counts negotiators on Ix toward effective spice cost', () => {
    const player = { spice: 1, solari: 0, negotiatorsOnIx: 2 }
    expect(canPlayerAffordTechTile(player, 3)).toBe(true)
    expect(canPlayerAffordTechTile(player, 4)).toBe(false)
  })

  it('uses solari when paySolariInsteadOfSpice is set', () => {
    const player = { spice: 0, solari: 4, negotiatorsOnIx: 0 }
    expect(canPlayerAffordTechTile(player, 3, { paySolariInsteadOfSpice: true })).toBe(true)
    expect(canPlayerAffordTechTile(player, 5, { paySolariInsteadOfSpice: true })).toBe(false)
  })
})
