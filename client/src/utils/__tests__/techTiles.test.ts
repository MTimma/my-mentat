import { describe, expect, it } from 'vitest'
import { TECH_TILES, TechTileId } from '../../data/techTiles'
import { canPlayerAffordTechTile, techTilesAvailableForNextReveal } from '../techTiles'
import { makePlayer } from '../../components/GameContext/__tests__/_helpers'

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

  it('ignores negotiators for browse preview when requested', () => {
    const player = { spice: 3, solari: 0, negotiatorsOnIx: 2 }
    expect(canPlayerAffordTechTile(player, 5, { ignoreNegotiators: true })).toBe(false)
    expect(canPlayerAffordTechTile(player, 3, { ignoreNegotiators: true })).toBe(true)
  })

  it('uses solari when paySolariInsteadOfSpice is set', () => {
    const player = { spice: 0, solari: 4, negotiatorsOnIx: 0 }
    expect(canPlayerAffordTechTile(player, 3, { paySolariInsteadOfSpice: true })).toBe(true)
    expect(canPlayerAffordTechTile(player, 5, { paySolariInsteadOfSpice: true })).toBe(false)
  })
})

describe('techTilesAvailableForNextReveal', () => {
  it('excludes player-owned tiles and current face-ups, not stack placeholders', () => {
    const players = [
      makePlayer(0, { tech: [{ id: TechTileId.FLAGSHIP, faceUp: true }] }),
      makePlayer(1),
    ]
    const stacks: TechTileId[][] = [
      [TechTileId.MINIMIC_FILM, TechTileId.ARTILLERY, TechTileId.WINDTRAPS],
      [TechTileId.HOLTZMAN_ENGINE],
      [],
    ]
    const available = techTilesAvailableForNextReveal(stacks, players, TechTileId.MINIMIC_FILM)
    expect(available).not.toContain(TechTileId.MINIMIC_FILM)
    expect(available).not.toContain(TechTileId.FLAGSHIP)
    expect(available).not.toContain(TechTileId.HOLTZMAN_ENGINE)
    expect(available).toContain(TechTileId.ARTILLERY)
    expect(available).toContain(TechTileId.WINDTRAPS)
    expect(available).toHaveLength(TECH_TILES.length - 3)
  })
})
