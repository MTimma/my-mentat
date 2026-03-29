/**
 * Percent positions for board markers on the full image (inner-board 0–100, same as hotspots).
 * Tune with ?markerDebug=1 — edit values here to match Board.jpg.
 */
import {
  ControlMarkerType,
  FactionType,
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
    laneCenterX: [12.8, 14.2, 15.6, 17],
    baselineY: 24,
    stepY: -2.1,
  },
  [FactionType.SPACING_GUILD]: {
    laneCenterX: [12.8, 14.2, 15.6, 17],
    baselineY: 38,
    stepY: -2.1,
  },
  [FactionType.BENE_GESSERIT]: {
    laneCenterX: [12.8, 14.2, 15.6, 17],
    baselineY: 60,
    stepY: -2.1,
  },
  [FactionType.FREMEN]: {
    laneCenterX: [12.8, 14.2, 15.6, 17],
    baselineY: 84,
    stepY: -2.1,
  },
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
  { x: 42, y: 5 },
  { x: 44.8, y: 5 },
  { x: 47.6, y: 5 },
  { x: 50.4, y: 5 },
]

/** Conflict card panel **/
export const CONFLICT_CARD_RECT = {
  left: 30,
  top: 70,
  width: 9,
  height: 13,
} as const

/** First combat strength row (inner %); align with conflict panel column */
export const COMBAT_STRENGTH_ORIGIN = { x: 56, y: 38 }
export const COMBAT_STRENGTH_ROW_STEP_Y = 2.6

export const CONTROL_MARKER_POINTS: Record<ControlMarkerType, { x: number; y: number }> = {
  [ControlMarkerType.ARRAKIN]: { x: 80.5, y: 34 },
  [ControlMarkerType.CARTHAG]: { x: 62.5, y: 37 },
  [ControlMarkerType.IMPERIAL_BASIN]: { x: 80.5, y: 51 },
}

/** Optional extracted card art: run scripts/extract-conflicts-assets.py → public/conflicts/cards/ */
export const CONFLICT_CARD_IMAGE_SLUG: Partial<Record<number, string>> = {
  901: 'skirmish-1',
  902: 'skirmish-2',
  903: 'skirmish-3',
  904: 'skirmish-4',
  905: 'siege-of-arrakeen',
  906: 'siege-of-carthag',
  907: 'secure-imperial-basin',
  908: 'cloak-and-dagger',
  909: 'machinations',
  910: 'desert-power',
  911: 'raid-stockpiles',
  912: 'trade-monopoly',
  913: 'guild-bank-raid',
  914: 'sort-through-the-chaos',
  915: 'terrible-purpose',
  916: 'battle-for-arrakeen',
  917: 'economic-supremacy',
  918: 'grand-vision',
}

export function conflictCardImageSrc(conflictId: number): string | null {
  const slug = CONFLICT_CARD_IMAGE_SLUG[conflictId]
  return slug ? `/conflicts/cards/${slug}.png` : null
}

export function clampInfluenceStep(v: number): number {
  return Math.max(0, Math.min(MAX_INFLUENCE, Math.round(v)))
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
