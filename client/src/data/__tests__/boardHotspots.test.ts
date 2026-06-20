import { describe, expect, it } from 'vitest'
import {
  BOARD_HOTSPOTS,
  BOARD_HOTSPOTS_FOR_EXPANSIONS,
} from '../boardHotspots'
import {
  mentatAvailabilityPoint,
  swordmasterEligibilityPoint,
} from '../boardHotspots'
import { RISE_OF_IX_BOARD_HOTSPOTS_LAYER } from '../expansionBoardHotspots'
import { NO_EXPANSIONS } from '../../types/GameTypes'

describe('BOARD_HOTSPOTS_FOR_EXPANSIONS', () => {
  it('returns base hotspots only when riseOfIx is false', () => {
    const hotspots = BOARD_HOTSPOTS_FOR_EXPANSIONS(NO_EXPANSIONS)
    const ids = hotspots.map(h => h.spaceId)

    expect(ids).not.toContain(23)
    expect(ids).not.toContain(24)
    expect(ids).not.toContain(25)
    expect(ids).not.toContain(26)
    expect(ids).toContain(7)
    expect(ids).toContain(8)
    expect(hotspots).toEqual(BOARD_HOTSPOTS.filter(h => h.spaceId <= 22))
  })

  it('omits Sell Melange, Secure Contract, Rally Troops, and Hall of Oratory when riseOfIx is true', () => {
    const hotspots = BOARD_HOTSPOTS_FOR_EXPANSIONS({ riseOfIx: true, riseOfIxEpic: false })
    const ids = hotspots.map(h => h.spaceId)

    expect(ids).not.toContain(7)
    expect(ids).not.toContain(8)
    expect(ids).not.toContain(11)
    expect(ids).not.toContain(12)
    expect(ids).toContain(9)
    expect(ids).toContain(13)
  })

  it('includes RoI CHOAM hotspots 25–26 when riseOfIx is true', () => {
    const hotspots = BOARD_HOTSPOTS_FOR_EXPANSIONS({ riseOfIx: true, riseOfIxEpic: false })
    const ids = hotspots.map(h => h.spaceId)

    expect(ids).toEqual(expect.arrayContaining([25, 26]))
    const riseOfIxHotspots = RISE_OF_IX_BOARD_HOTSPOTS_LAYER.hotspots
    expect(riseOfIxHotspots.every(h => ids.includes(h.spaceId))).toBe(true)
    expect(ids).not.toContain(23)
    expect(ids).not.toContain(24)
  })

  it('applies RoI retunes for spaces that share a base id', () => {
    const base = BOARD_HOTSPOTS.find(h => h.spaceId === 13)!
    const roi = BOARD_HOTSPOTS_FOR_EXPANSIONS({ riseOfIx: true, riseOfIxEpic: false }).find(
      h => h.spaceId === 13
    )!

    const changed =
      roi.left !== base.left ||
      roi.top !== base.top ||
      roi.width !== base.width ||
      roi.height !== base.height ||
      roi.agentX !== base.agentX ||
      roi.agentY !== base.agentY
    expect(changed).toBe(true)
  })

  it('preserves base hotspot count minus disabled ids plus net-new RoI spaces', () => {
    const baseCount = BOARD_HOTSPOTS.length
    const roiOn = BOARD_HOTSPOTS_FOR_EXPANSIONS({ riseOfIx: true, riseOfIxEpic: false })
    const riseOfIxHotspots = RISE_OF_IX_BOARD_HOTSPOTS_LAYER.hotspots
    const netNewRoiSpaces = riseOfIxHotspots.filter(
      h => !BOARD_HOTSPOTS.some(base => base.spaceId === h.spaceId)
    ).length

    expect(roiOn).toHaveLength(baseCount - 4 + netNewRoiSpaces)
  })

  it('mentat and swordmaster tracker anchors follow RoI hotspot retunes', () => {
    const baseMentat = BOARD_HOTSPOTS.find(h => h.spaceId === 10)!
    const roiMentat = BOARD_HOTSPOTS_FOR_EXPANSIONS({ riseOfIx: true, riseOfIxEpic: false }).find(
      h => h.spaceId === 10
    )!
    const baseSword = BOARD_HOTSPOTS.find(h => h.spaceId === 13)!
    const roiSword = BOARD_HOTSPOTS_FOR_EXPANSIONS({ riseOfIx: true, riseOfIxEpic: false }).find(
      h => h.spaceId === 13
    )!

    expect(mentatAvailabilityPoint(roiMentat)).not.toEqual(mentatAvailabilityPoint(baseMentat))
    expect(swordmasterEligibilityPoint(roiSword, 0, 4)).not.toEqual(
      swordmasterEligibilityPoint(baseSword, 0, 4)
    )
  })
})
