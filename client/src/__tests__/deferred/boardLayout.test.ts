/** DEFERRED — not run by Vitest (see vite.config.ts exclude). */
import { describe, expect, it } from 'vitest'
import { BOARD_HOTSPOTS, MARKER_ANCHORS, layoutHotspotPercent } from '../../data/boardHotspots'
import { BOARD_SPACES } from '../../data/boardSpaces'

describe('Image board layout — base game', () => {
  it('every board space has exactly one hotspot', () => {
    const ids = BOARD_HOTSPOTS.map(h => h.spaceId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const space of BOARD_SPACES) {
      expect(ids).toContain(space.id)
    }
  })

  it('marker anchors align to hotspot centers', () => {
    for (const anchor of MARKER_ANCHORS) {
      const hotspot = BOARD_HOTSPOTS.find(h => h.spaceId === anchor.spaceId)
      expect(hotspot, `missing hotspot for space ${anchor.spaceId}`).toBeDefined()
      const box = layoutHotspotPercent(hotspot!)
      const expectedX = box.left + box.width * 0.5
      const expectedY = box.top + box.height * 0.4
      expect(anchor.x).toBeCloseTo(expectedX, 1)
      expect(anchor.y).toBeCloseTo(expectedY, 1)
    }
  })

  it('hotspot boxes stay within inner board 0–100', () => {
    for (const h of BOARD_HOTSPOTS) {
      const box = layoutHotspotPercent(h)
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.top).toBeGreaterThanOrEqual(0)
      expect(box.left + box.width).toBeLessThanOrEqual(100.5)
      expect(box.top + box.height).toBeLessThanOrEqual(100.5)
    }
  })

  it.todo('agent token renders at MARKER_ANCHORS position for occupied space (component test)')
  it.todo('VP / influence trackers use boardMarkerAnchors lanes per player id order')
})
