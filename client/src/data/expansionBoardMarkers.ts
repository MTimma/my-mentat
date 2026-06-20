import type { Expansions } from '../types/GameTypes'
import { ControlMarkerType } from '../types/GameTypes'

/**
 * Expansion-specific board marker positions (CHOAM track, dreadnought badges, overlays).
 *
 * ## Coordinate system
 * Values are **inner-board 0–100** (same as `boardHotspots.ts` / `boardMarkerAnchors.ts`).
 * `ImageBoard` passes them through `stagePoint()` → CSS `left`/`top` % on `.image-board__stage`.
 *
 * ## Tuning the shipping track (`RISE_OF_IX_BOARD_MARKERS_LAYER.shippingTrackAnchors`)
 * One entry per **player lane** (sorted by player id). The CHOAM track is vertical on the art:
 * - **`x`** — horizontal center of that player's column.
 * - **`laneCenterY[step]`** — vertical center at freighter step 0–3 (0 = bottom, 3 = top).
 *
 * - Move one player's column **left/right**: change that entry's **`x`**.
 * - Move every column **left/right**: change all **`x`** values by the same delta.
 * - Move a **step row** up/down for everyone: change `laneCenterY[step]` on every player entry.
 * - Move the **whole CHOAM strip** (art + track): `choamOverlayRect`.
 */

/** Per-player column on the vertical CHOAM shipping track (inner %). */
export interface ShippingTrackPlayerAnchor {
  player: 0 | 1 | 2 | 3
  /** Horizontal center of this player's track column. */
  x: number
  /** Vertical center per freighter step 0–3 (bottom → top). */
  laneCenterY: [number, number, number, number]
}

export interface ExpansionBoardMarkersLayer {
  isEnabled: (expansions: Expansions) => boolean
  /** `riseofix1.png` placement on Board.jpg (inner %). */
  choamOverlayRect?: { left: number; top: number; width: number; height: number }
  shippingTrackAnchors?: readonly ShippingTrackPlayerAnchor[]
  freighterStatusButton?: { x: number; y: number }
  dreadnoughtControlPoints?: Record<ControlMarkerType, { x: number; y: number }>
}

/**
 * Rise of Ix — CHOAM overlay and freighter track marker positions.
 * Tune with `?markerDebug=1`; values are inner-board 0–100 (see `boardHotspots.ts`).
 */
export const RISE_OF_IX_BOARD_MARKERS_LAYER: ExpansionBoardMarkersLayer = {
  isEnabled: expansions => expansions.riseOfIx,
  choamOverlayRect: { left: 27, top: 0.5, width: 73, height: 22 },
  // Columns sit on the vertical track art between Swordmaster (~62) and Interstellar Shipping (~66).
  shippingTrackAnchors: [
    { player: 0, x: 84, laneCenterY: [18, 13, 9, 5] },
    { player: 1, x: 86, laneCenterY: [18, 13, 9, 5] },
    { player: 2, x: 88, laneCenterY: [18, 13, 9, 5] },
    { player: 3, x: 90, laneCenterY: [18, 13, 9, 5] },
  ],
  freighterStatusButton: { x: 22, y: 50 },
  dreadnoughtControlPoints: {
    [ControlMarkerType.ARRAKIN]: { x: 82, y: 34 },
    [ControlMarkerType.CARTHAG]: { x: 65, y: 37 },
    [ControlMarkerType.IMPERIAL_BASIN]: { x: 81, y: 49 },
  },
}

export const EXPANSION_BOARD_MARKERS: ExpansionBoardMarkersLayer[] = [
  RISE_OF_IX_BOARD_MARKERS_LAYER,
]

export function activeExpansionBoardMarkers(
  expansions: Expansions
): ExpansionBoardMarkersLayer[] {
  return EXPANSION_BOARD_MARKERS.filter(layer => layer.isEnabled(expansions))
}

function lastActiveLayer(expansions: Expansions): ExpansionBoardMarkersLayer | undefined {
  const layers = activeExpansionBoardMarkers(expansions)
  return layers.length > 0 ? layers[layers.length - 1] : undefined
}

export function choamOverlayRectFor(
  expansions: Expansions
): { left: number; top: number; width: number; height: number } | undefined {
  return lastActiveLayer(expansions)?.choamOverlayRect
}

export function shippingTrackAnchorsFor(
  expansions: Expansions
): readonly ShippingTrackPlayerAnchor[] | undefined {
  return lastActiveLayer(expansions)?.shippingTrackAnchors
}

export function freighterStatusButtonFor(
  expansions: Expansions
): { x: number; y: number } | undefined {
  return lastActiveLayer(expansions)?.freighterStatusButton
}

export function dreadnoughtControlPointsFor(
  expansions: Expansions
): Record<ControlMarkerType, { x: number; y: number }> | undefined {
  return lastActiveLayer(expansions)?.dreadnoughtControlPoints
}
