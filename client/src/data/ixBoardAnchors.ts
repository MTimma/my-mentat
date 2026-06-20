/**
 * Rise of Ix — `riseofix2.png` overlay (full Ix board panel).
 *
 * All rects/points below use **local 0–100** coordinates within the panel.
 * Embedded/mobile placement also uses `IX_BOARD_OVERLAY_RECT` on Board.jpg.
 * Tune with `?hotspotDebug=1` / `?markerDebug=1`.
 */
import {
  layoutInnerRectPercent,
  type BoardHotspot,
} from './boardHotspots'

/** Position of the Ix board image on the main `Board.jpg` (inner %). */
export const IX_BOARD_OVERLAY_RECT = { left: 4, top: 20, width: 28, height: 28 }

function ixHotspot(
  spaceId: number,
  rect: { left: number; top: number; width: number; height: number },
  agent: { x: number; y: number } = { x: 18, y: 62 }
): BoardHotspot {
  return { spaceId, ...rect, agentX: agent.x, agentY: agent.y }
}

/** Board spaces on the Ix panel (Dreadnought, Tech Negotiation). */
export const IX_BOARD_HOTSPOTS: BoardHotspot[] = [
  ixHotspot(24, { left: 6, top: 4, width: 47, height: 27 }, { x: 30, y: 52 }), // Tech Negotiation
  ixHotspot(23, { left: 6, top: 31, width: 47, height: 27 }, { x: 30, y: 52 }), // Dreadnought
]

/** Face-up tech tile slots (right column, top → bottom). */
export const IX_TECH_TILE_RECTS: Array<{
  stackIndex: number
  left: number
  top: number
  width: number
  height: number
}> = [
  { stackIndex: 0, left: 56, top: 5, width: 40, height: 24 },
  { stackIndex: 1, left: 56, top: 33, width: 40, height: 24 },
  { stackIndex: 2, left: 56, top: 63, width: 40, height: 24 },
]

/** Per-player negotiator pips on the shield track (sorted by player id). */
export const IX_NEGOTIATOR_LANE_ANCHORS: Array<{ x: number; y: number }> = [
  { x: 22, y: 90 },
  { x: 31, y: 92 },
  { x: 40, y: 92 },
  { x: 49, y: 90 },
]

export function layoutIxBoardOnStage(): {
  left: number
  top: number
  width: number
  height: number
} {
  return layoutInnerRectPercent(IX_BOARD_OVERLAY_RECT)
}

export function layoutIxLocalRectPercent(rect: {
  left: number
  top: number
  width: number
  height: number
}): { left: number; top: number; width: number; height: number } {
  const board = layoutIxBoardOnStage()
  return {
    left: board.left + (rect.left / 100) * board.width,
    top: board.top + (rect.top / 100) * board.height,
    width: (rect.width / 100) * board.width,
    height: (rect.height / 100) * board.height,
  }
}

export function layoutIxLocalPointPercent(x: number, y: number): { x: number; y: number } {
  const board = layoutIxBoardOnStage()
  return {
    x: board.left + (x / 100) * board.width,
    y: board.top + (y / 100) * board.height,
  }
}

export function layoutIxAgentAnchorPercent(h: BoardHotspot): { x: number; y: number } {
  const box = layoutIxLocalRectPercent({
    left: h.left,
    top: h.top,
    width: h.width,
    height: h.height,
  })
  return {
    x: box.left + box.width * (h.agentX / 100),
    y: box.top + box.height * (h.agentY / 100),
  }
}

export function ixBoardMarkerAnchors(): Array<{ spaceId: number; x: number; y: number }> {
  return IX_BOARD_HOTSPOTS.map(h => {
    const p = layoutIxAgentAnchorPercent(h)
    return { spaceId: h.spaceId, x: p.x, y: p.y }
  })
}
