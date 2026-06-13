/**
 * Percent positions for board markers on the full image (inner-board 0–100, same as hotspots).
 * Tune with ?markerDebug=1 — edit values here to match Board.jpg.
 */
import {
  ControlMarkerType,
  FactionType,
  MakerSpace,
  PlayerColor,
} from '../types/GameTypes'
import { layoutInnerPointPercent, layoutInnerRectPercent } from './boardHotspots'
import { MAX_INFLUENCE } from '../utils/influenceVictoryPoints'

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
    laneCenterX: [4, 5.8, 7.6, 9.4],
    baselineY: 24,
    stepY: -3.5,
  },
  [FactionType.SPACING_GUILD]: {
    laneCenterX: [4, 5.8, 7.6, 9.4],
    baselineY: 49,
    stepY: -3.5,
  },
  [FactionType.BENE_GESSERIT]: {
    laneCenterX: [4, 5.8, 7.6, 9.4],
    baselineY: 73,
    stepY: -3.5,
  },
  [FactionType.FREMEN]: {
    laneCenterX: [4, 5.8, 7.6, 9.4],
    baselineY: 98,  
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
  [FactionType.EMPEROR]: { left: 3, top: 2, width: 9, height: 23 },
  [FactionType.SPACING_GUILD]: { left: 3, top: 27, width: 9, height: 23 },
  [FactionType.BENE_GESSERIT]: { left: 3, top: 51, width: 9, height: 23 },
  [FactionType.FREMEN]: { left: 3, top: 76, width: 9, height: 23 },
}

/**
 * Victory track: one **vertical** lane per player (same order as elsewhere: sorted by `player.id`).
 *
 * - **`x`**: fixed column (inner %).
 * - **`baselineY`**: marker position when **total VP = 0** (bottom of that lane on the art; larger Y = lower on the board image).
 * - **`stepY`**: add **`stepY * totalVp`** each frame. Use a **negative** value so each extra VP moves the marker **up** (smaller inner Y).
 *
 * **0 vs 1 VP:** The app uses **actual total VP** from `getTotalVictoryPoints` (includes printed starting VP, often **1**). So:
 * - At **0** VP, the piece sits on **`baselineY`**.
 * - At **1** VP, it sits at **`baselineY + stepY`** (one step up). If everyone starts at 1, all markers start one step above the “0” row; at **2** VP they move up again, etc.
 */
export const VP_LANES: Array<{ x: number; baselineY: number; stepY: number }> = [
  { x: 96, baselineY: 97, stepY: -5.5 },
  { x: 98, baselineY: 97, stepY: -5.5 },
  { x: 96, baselineY: 95, stepY: -5.5 },
  { x: 98, baselineY: 95, stepY: -5.5 },
]

/** Left→right seat slots (inner %) next to High Council */
export const HIGH_COUNCIL_SLOTS: Array<{ x: number; y: number }> = [
  { x: 42, y: 6 },
  { x: 44.8, y: 6 },
  { x: 52.6, y: 6 },
  { x: 56.0, y: 6 },
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
 */
export const COMBAT_RING_ANCHORS: Record<PlayerColor, { x: number; y: number }> = {
  [PlayerColor.RED]: { x: 55, y: 60 },
  [PlayerColor.GREEN]: { x: 85, y: 60 },
  [PlayerColor.YELLOW]: { x: 85, y: 80 },
  [PlayerColor.BLUE]: { x: 55, y: 80 },
}

/** Bounding box for the merged combat-area cluster (inner %). Tune with ?markerDebug=1. */
export const COMBAT_AREA_BOUNDS = {
  left: 47,
  top: 56,
  width: 45,
  height: 34,
} as const

/** Effect-retreat dock vertical anchor (inner % Y); X is in App.css `.effect-retreat-troop-dock__anchor`. */
export const COMBAT_STRENGTH_ORIGIN = { x: 58, y: 72 }

export const CONTROL_MARKER_POINTS: Record<ControlMarkerType, { x: number; y: number }> = {
  [ControlMarkerType.ARRAKIN]: { x: 78, y: 34 },
  [ControlMarkerType.CARTHAG]: { x: 61, y: 37 },
  [ControlMarkerType.IMPERIAL_BASIN]: { x: 77, y:49 },
}

/**
 * Bonus spice (Makers phase) badge anchors (inner %).
 * Anchor is the badge center — same as agent/VP markers. Tune with ?markerDebug=1.
 */
export const BONUS_SPICE_ANCHORS: Record<MakerSpace, { x: number; y: number }> = {
  [MakerSpace.IMPERIAL_BASIN]: { x: 88, y: 44 },
  [MakerSpace.GREAT_FLAT]: { x: 43, y: 62 },
  [MakerSpace.HAGGA_BASIN]: { x: 69, y: 50 },
}

/** Conflict card art under public/conflicts/cards/. */
export const CONFLICT_CARD_IMAGE_FILE: Partial<Record<number, string>> = {
  901: 'skirmish-iii.webp',
  902: 'skirmish-iiii.webp',
  903: 'skirmish-ii.webp',
  904: 'skirmish-i.webp',
  905: 'siege-of-arrakeen.webp',
  906: 'siege-of-carthag.webp',
  907: 'secure-imperial-basin.webp',
  908: 'cloak-and-dagger.webp',
  909: 'machinations.webp',
  910: 'desert-power.webp',
  911: 'raid-stockpiles.webp',
  912: 'sort-through-the-chaos.webp',
  913: 'guild-bank-raid.webp',
  914: 'terrible-purpose.webp',
  915: 'battle-for-imperial-basin.webp',
  916: 'battle-for-arrakeen.webp',
  917: 'battle-for-carthag.webp',
  918: 'grand-vision.webp',
}

export function conflictCardImageSrc(conflictId: number): string | null {
  const filename = CONFLICT_CARD_IMAGE_FILE[conflictId]
  return filename ? `/conflicts/cards/${filename}` : null
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
