import type { BoardSetId, ExpansionBoardLayer, InnerPoint, InnerRect } from '../types'

/**
 * Immortality board anchors, **keyed by board set** so the same module works on
 * any base. Values are local 0–100 within `bene_tleilax_board.png`.
 * Tune with `?markerDebug=1`.
 *
 * Layout (per `.cursor/immortality` and printed art):
 * - **Top** — linear Tleilaxu (beetle) track
 * - **Bottom** — branching research hex grid
 */

/** Research Station overlay (`board/immortality/research_station.png`) per base. */
const RESEARCH_STATION_OVERLAY_RECT: Partial<Record<BoardSetId, InnerRect>> = {
  imperium: { left: 41, top: 34, width: 18, height: 12 },
}

/**
 * Per-player lane offsets on the Bene Tleilax panel (local % within the image).
 * Index by sorted player id (0–3).
 */
export interface ImmortalityPanelAnchors {
  panelRect: InnerRect
  /** Vertical lane offset for each player on the top Tleilaxu strip. */
  tleilaxuLaneY: number[]
  /** Vertical lane offset for each player on the bottom research grid. */
  researchLaneY: number[]
}

const PANEL_ANCHORS: Partial<Record<BoardSetId, ImmortalityPanelAnchors>> = {
  imperium: {
    panelRect: { left: 2, top: 50, width: 30, height: 30 },
    tleilaxuLaneY: [9, 12, 15, 18],
    researchLaneY: [48, 54, 60, 66],
  },
}

export function researchStationOverlayRect(boardSet: BoardSetId): InnerRect | undefined {
  return RESEARCH_STATION_OVERLAY_RECT[boardSet]
}

export function immortalityPanelAnchors(boardSet: BoardSetId): ImmortalityPanelAnchors | undefined {
  return PANEL_ANCHORS[boardSet]
}

export const BENE_TLEILAX_BOARD_SRC = 'board/immortality/bene_tleilax_board.png'

/** Research hex positions on the bottom grid (shared x/y; lanes add per-player y). */
export const RESEARCH_NODE_POSITIONS: Record<string, InnerPoint> = {
  r0: { x: 7, y: 55 },
  r1: { x: 16, y: 55 },
  r2a: { x: 25, y: 48 },
  r2b: { x: 25, y: 62 },
  r3: { x: 34, y: 55 },
  r4: { x: 43, y: 55 },
  r5a: { x: 52, y: 48 },
  r5b: { x: 52, y: 62 },
  r6: { x: 68, y: 55 },
}

/** Gene-unlock indicator positions on the research grid. */
export const RESEARCH_GENE_MARKERS: Record<1 | 2, InnerPoint> = {
  1: { x: 34, y: 72 },
  2: { x: 68, y: 72 },
}

/** Tleilaxu linear track — step index → local % on the top strip. */
export const TLEILAXU_STEP_POSITIONS: Record<number, InnerPoint> = {
  0: { x: 7, y: 12 },
  1: { x: 17, y: 12 },
  2: { x: 27, y: 12 },
  3: { x: 37, y: 12 },
  4: { x: 47, y: 12 },
  5: { x: 57, y: 12 },
  6: { x: 67, y: 12 },
  7: { x: 77, y: 12 },
  8: { x: 87, y: 12 },
}

export const TLEILAXU_VP_STEP = 4

const DEFAULT_TLEILAXU_LANES = [9, 12, 15, 18]
const DEFAULT_RESEARCH_LANES = [48, 54, 60, 66]

export function researchTokenPosition(
  nodeId: string | undefined,
  playerLaneIndex = 0,
  boardSet: BoardSetId = 'imperium'
): InnerPoint {
  const base = RESEARCH_NODE_POSITIONS[nodeId ?? 'r0'] ?? RESEARCH_NODE_POSITIONS.r0
  const anchors = immortalityPanelAnchors(boardSet)
  const laneY = anchors?.researchLaneY[playerLaneIndex] ?? DEFAULT_RESEARCH_LANES[playerLaneIndex] ?? base.y
  return { x: base.x, y: laneY }
}

export function tleilaxuTokenPosition(
  step: number | undefined,
  playerLaneIndex = 0,
  boardSet: BoardSetId = 'imperium'
): InnerPoint {
  const clamped = Math.max(0, Math.min(8, step ?? 0))
  const base = TLEILAXU_STEP_POSITIONS[clamped] ?? TLEILAXU_STEP_POSITIONS[0]
  const anchors = immortalityPanelAnchors(boardSet)
  const laneY = anchors?.tleilaxuLaneY[playerLaneIndex] ?? DEFAULT_TLEILAXU_LANES[playerLaneIndex] ?? base.y
  return { x: base.x, y: laneY }
}

/** Board layer (main-board overlays) for a board set. */
export function immortalityBoardLayer(boardSet: BoardSetId): ExpansionBoardLayer {
  const overlays = []
  const researchRect = RESEARCH_STATION_OVERLAY_RECT[boardSet]
  if (researchRect) {
    overlays.push({
      id: 'immortality-research-station',
      src: 'board/immortality/research_station.png',
      rect: researchRect,
    })
  }
  return { overlays }
}
