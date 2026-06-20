import { describe, expect, it } from 'vitest'
import { TECH_TILES, TechTileId } from '../techTiles'

describe('techTiles', () => {
  it('TECH_TILES has exactly 18 entries', () => {
    expect(TECH_TILES).toHaveLength(18)
  })

  it('every TechTileId enum value appears once in TECH_TILES', () => {
    const ids = TECH_TILES.map(tile => tile.id)
    const enumValues = Object.values(TechTileId)
    expect(ids).toHaveLength(enumValues.length)
    for (const value of enumValues) {
      expect(ids.filter(id => id === value)).toHaveLength(1)
    }
  })

  it('every tile has an image URL that starts with /technologies/rise_of_ix/', () => {
    for (const tile of TECH_TILES) {
      expect(tile.image.startsWith('/technologies/rise_of_ix/')).toBe(true)
    }
  })
})
