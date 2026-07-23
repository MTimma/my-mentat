/**
 * Base-game board marker positions (inner-board 0–100, same as `boardHotspots.ts`).
 * Tune with `?markerDebug=1`.
 *
 * Expansion layout (CHOAM track, dreadnought badges, RoI hotspot retunes):
 * - `expansionBoardMarkers.ts`
 * - `expansionBoardHotspots.ts`
 * - `ixBoardAnchors.ts` (Ix panel overlay)
 *
 * Rise of Ix leader / conflict assets:
 * - `leaderAbilities/tessiaSnoopers.ts` (snooper tokens)
 * - `conflictsRiseOfIx.ts` + `conflictCardImages.ts` (conflict card art)
 */
import {
  ControlMarkerType,
  FactionType,
  MakerSpace,
  PlayerColor,
} from '../types/GameTypes'
import { layoutInnerPointPercent, layoutInnerRectPercent } from './boardHotspots'
import { MAX_INFLUENCE } from '../utils/influenceVictoryPoints'

export { conflictCardImageSrc, CONFLICT_CARD_IMAGE_FILE } from './conflictCardImages'
export {
  SNOOPER_TOKEN_ANCHORS,
  snooperTokenPoint,
  snooperTokenHeightPercent,
  TESSIA_PARKED_SNOOPER_SLOTS,
} from './leaderAbilities/tessiaSnoopers'
export {
  foldspaceDeckCountPoint,
  mentatAvailabilityPoint,
  swordmasterEligibilityPoint,
} from './boardHotspots'

export const BOARD_MARKER_VP_MAX_STEPS = 12

export interface InfluenceTrackLayout {
  /** X center (inner %) for each player lane, left→right = ascending player id order */
  laneCenterX: [number, number, number, number]
  /** Y (inner %) for influence 0 */
  baselineY: number
  /** Added per influence step (negative = move up on board art) */
  stepY: number
}

export const INFLUENCE_TRACKS: Record<FactionType, InfluenceTrackLayout> = {
  [FactionType.EMPEROR]: {
    laneCenterX: [3.8, 6.1, 8.4, 10.7],
    baselineY: 23.2,
    stepY: -3.5,
  },
  [FactionType.SPACING_GUILD]: {
    laneCenterX: [3.8, 6.1, 8.4, 10.7],
    baselineY: 48,
    stepY: -3.5,
  },
  [FactionType.BENE_GESSERIT]: {
    laneCenterX: [3.8, 6.1, 8.4, 10.7],
    baselineY: 72.8,
    stepY: -3.5,
  },
  [FactionType.FREMEN]: {
    laneCenterX: [3.8, 6.1, 8.4, 10.7],
    baselineY: 97.1,
    stepY: -3.5,
  },
}

/**
 * Full tap/highlight region for each faction influence column on the board art (inner %).
 * Tune with ?markerDebug=1 — cyan outlines when influence selection is active.
 */
export const INFLUENCE_TRACK_AREAS: Record<
  FactionType,
  { left: number; top: number; width: number; height: number }
> = {
  [FactionType.EMPEROR]: { left: 2, top: 1, width: 11, height: 24 },
  [FactionType.SPACING_GUILD]: { left: 2, top: 26, width: 11, height: 24 },
  [FactionType.BENE_GESSERIT]: { left: 2, top: 50.5, width: 11, height: 24 },
  [FactionType.FREMEN]: { left: 2, top: 75, width: 11, height: 24 },
}

/**
 * Victory track: one **vertical** lane per player (same order as elsewhere: sorted by `player.id`).
 *
 * - **`x`**: fixed column (inner %).
 * - **`baselineY`**: marker position when **total VP = 0** (bottom of that lane on the art; larger Y = lower on the board image).
 * - **`stepY`**: add **`stepY * totalVp`** each frame. Use a **negative** value so each extra VP moves the marker **up** (smaller inner Y).
 */
export const VP_LANES: Array<{ x: number; baselineY: number; stepY: number }> = [
  { x: 96, baselineY: 97, stepY: -5.5 },
  { x: 98, baselineY: 97, stepY: -5.5 },
  { x: 96, baselineY: 95, stepY: -5.5 },
  { x: 98, baselineY: 95, stepY: -5.5 },
]

/** Left→right seat slots (inner %) next to High Council */
export const HIGH_COUNCIL_SLOTS: Array<{ x: number; y: number }> = [
  { x: 42.5, y: 7 },
  { x: 45.9, y: 7 },
  { x: 53.4, y: 7 },
  { x: 56.9, y: 7 },
]

/** Conflict card panel **/
export const CONFLICT_CARD_RECT = {
  left: 30,
  top: 70,
  width: 9,
  height: 13,
} as const

/**
 * Combat conflict rings (inner %, ring center). 2×2 on crossed swords:
 * Clockwise: red TL, green TR, yellow BR, blue BL. Tune with ?markerDebug=1.
 *
 * Used for marker debug only. Live combat UI seats players by `COMBAT_AREA_SEATS` (player id).
 */
export const COMBAT_RING_ANCHORS: Record<PlayerColor, { x: number; y: number }> = {
  [PlayerColor.RED]: { x: 55, y: 60 },
  [PlayerColor.GREEN]: { x: 85, y: 60 },
  [PlayerColor.YELLOW]: { x: 85, y: 80 },
  [PlayerColor.BLUE]: { x: 55, y: 80 },
}

/**
 * Combat grid seat slots by player id (2×2). Left column top/bottom, right column top/bottom.
 * Matches default colors at each seat: P1 red TL, P2 green TR, P3 yellow BR, P4 blue BL.
 */
export const COMBAT_AREA_SEATS: number[][] = [
  [0, 3],
  [1, 2],
]

/** Bounding box for the merged combat-area cluster (inner %). Tune with ?markerDebug=1. */
export const COMBAT_AREA_BOUNDS = {
  left: 47,
  top: 56,
  width: 45,
  height: 34,
} as const

/** Troop deploy controls — below conflict card, left of leader grid. Tune with ?markerDebug=1. */
export const COMBAT_DEPLOY_DOCK_RECT = {
  left: CONFLICT_CARD_RECT.left,
  top: CONFLICT_CARD_RECT.top + CONFLICT_CARD_RECT.height,
  width: COMBAT_AREA_BOUNDS.left - CONFLICT_CARD_RECT.left,
  height:
    COMBAT_AREA_BOUNDS.top +
    COMBAT_AREA_BOUNDS.height -
    (CONFLICT_CARD_RECT.top + CONFLICT_CARD_RECT.height),
} as const

/** Effect-retreat dock vertical anchor (inner % Y); X is in App.css `.effect-retreat-troop-dock__anchor`. */
export const COMBAT_STRENGTH_ORIGIN = { x: 58, y: 72 }

export const CONTROL_MARKER_POINTS: Record<ControlMarkerType, { x: number; y: number }> = {
  [ControlMarkerType.ARRAKIN]: { x: 78.1, y: 33.7 },
  [ControlMarkerType.CARTHAG]: { x: 60.8, y: 36.9 },
  [ControlMarkerType.IMPERIAL_BASIN]: { x: 76.8, y: 48.7 },
}

/**
 * Bonus spice (Makers phase) badge anchors (inner %).
 * Anchor is the badge center — same as agent/VP markers. Tune with ?markerDebug=1.
 */
export const BONUS_SPICE_ANCHORS: Record<MakerSpace, { x: number; y: number }> = {
  [MakerSpace.IMPERIAL_BASIN]: { x: 88.6, y: 44.3 },
  [MakerSpace.GREAT_FLAT]: { x: 43.3, y: 61.5 },
  [MakerSpace.HAGGA_BASIN]: { x: 69.1, y: 50.2 },
}

export function clampInfluenceStep(v: number): number {
  return Math.max(0, Math.min(MAX_INFLUENCE, Math.round(v)))
}

/** Click/highlight rect for the full faction influence column (inner %). */
export function influenceTrackAreaRect(
  faction: FactionType
): { left: number; top: number; width: number; height: number } {
  return INFLUENCE_TRACK_AREAS[faction]
}

export function clampVpStep(v: number): number {
  return Math.max(0, Math.min(BOARD_MARKER_VP_MAX_STEPS, Math.round(v)))
}

export function stagePoint(innerX: number, innerY: number): { x: number; y: number } {
  return layoutInnerPointPercent(innerX, innerY)
}

export function stageRect(rect: {
  left: number
  top: number
  width: number
  height: number
}) {
  return layoutInnerRectPercent(rect)
}
