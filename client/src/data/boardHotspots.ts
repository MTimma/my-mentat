import type { Expansions } from '../types/GameTypes'
import {
  activeExpansionBoardHotspots,
  extraMarkerAnchorsForExpansions,
  mergeBoardHotspots,
} from './expansionBoardHotspots'
import { BOARD_SPACES, FOLDSPACE_BOARD_SPACE_ID } from './boardSpaces'

/**
 * Hotspot regions and marker anchors for the full-image board (`public/board/Board.jpg`).
 *
 * Each `left`, `top`, `width`, `height` is 0–100. With **`BOARD_VIEWPORT_INSETS` all zero** (default),
 * that means % of the **full** image. If you set non-zero insets, the same four numbers are % of the
 * **inner** board rectangle only (you’ll need to re-measure or convert).
 *
 * ## Tune with browser DevTools
 * 1. Open the game, switch to Image Board, add **`?hotspotDebug=1`** to the URL (e.g. `http://localhost:5173/?hotspotDebug=1`). For VP / influence / combat markers use **`?markerDebug=1`** (see `boardMarkerAnchors.ts`).
 * 2b. With either flag, tracker nodes use **`pointer-events: auto`** so right-click **Inspect** targets them (e.g. `[data-marker="vp"]`); without a debug flag, pointers pass through to space buttons.
 * 2. You’ll see magenta outlines on every hitbox (orange tint when disabled).
 * 3. Right-click a misaligned box → **Inspect**.
 * 4. In the **Elements** panel, edit the `style` attribute on that `<button>`: change `left`, `top`, `width`, `height` until the outline matches the art.
 * 5. Copy the four percentages into the matching entry here (`spaceId` = `data-space-id` on the button).
 * 6. Agent meeple position: tune **`agentX`** / **`agentY`** (% of that hotspot’s width/height from its top-left). With `?hotspotDebug=1`, cyan dots show each anchor.
 * 7. Foldspace deck count: tune **`foldspaceDeckCountPoint`** in this file; with `?markerDebug=1`, cyan dot on `[data-marker="foldspace-deck"]`.
 *
 * ### City (blue circle) and desert / spice (yellow triangle) ids
 * | spaceId | name              |
 * |--------:|-------------------|
 * | 1       | Arrakeen          |
 * | 2       | Carthag           |
 * | 3       | Research Station  |
 * | 4       | Imperial Basin    |
 * | 5       | The Great Flat    |
 * | 6       | Hagga Basin       |
 *
 * Your `Board.jpg` is square (e.g. 1024×1024); older guesses assumed a taller board. Expect to nudge
 * **city** (ids 1–3) and **desert** (4–6) entries until they match. Optional **`BOARD_VIEWPORT_INSETS`**
 * helps when the printed board doesn’t fill the image (letterboxing inside the file).
 */

/** Margins inside the image file (0–100). The playable board is the inner rectangle; hotspot % are relative to that inner area. All zeros = use full image. */
export const BOARD_VIEWPORT_INSETS = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
} as const

export interface BoardHotspot {
  spaceId: number
  left: number
  top: number
  width: number
  height: number
  /** Agent meeple X as % of hotspot width from zone left (0–100). */
  agentX: number
  /** Agent meeple Y as % of hotspot height from zone top (0–100). */
  agentY: number
}

function hotspot(
  spaceId: number,
  rect: { left: number; top: number; width: number; height: number },
  agent: { x: number; y: number } = { x: 50, y: 40 }
): BoardHotspot {
  return { spaceId, ...rect, agentX: agent.x, agentY: agent.y }
}

/** Map hotspot (defined in inner board 0–100 space) to percentages of the full image/stage. */
export function layoutHotspotPercent(h: BoardHotspot): {
  left: number
  top: number
  width: number
  height: number
} {
  return layoutInnerRectPercent({
    left: h.left,
    top: h.top,
    width: h.width,
    height: h.height,
  })
}

/** Rect in inner-board 0–100 space → percent of full stage (same as hotspots). */
export function layoutInnerRectPercent(rect: {
  left: number
  top: number
  width: number
  height: number
}): { left: number; top: number; width: number; height: number } {
  const { left: il, right: ir, top: it, bottom: ib } = BOARD_VIEWPORT_INSETS
  const iw = 100 - il - ir
  const ih = 100 - it - ib
  return {
    left: il + (rect.left / 100) * iw,
    top: it + (rect.top / 100) * ih,
    width: (rect.width / 100) * iw,
    height: (rect.height / 100) * ih,
  }
}

/** Point in inner-board 0–100 space → percent on full stage. */
export function layoutInnerPointPercent(x: number, y: number): { x: number; y: number } {
  const { left: il, right: ir, top: it, bottom: ib } = BOARD_VIEWPORT_INSETS
  const iw = 100 - il - ir
  const ih = 100 - it - ib
  return {
    x: il + (x / 100) * iw,
    y: it + (y / 100) * ih,
  }
}

export interface MarkerAnchor {
  spaceId: number
  x: number
  y: number
}

export const BOARD_HOTSPOTS: BoardHotspot[] = [
  // === EMPEROR ===
  hotspot(14, { left: 12, top: 4, width: 15, height: 10 }, { x: 34, y: 60}),   // Conspire
  hotspot(15, { left: 12, top: 15, width: 15, height: 10 }, { x: 34, y: 50}),   // Wealth

  // === SPACING GUILD ===
  hotspot(17, { left: 12, top: 29, width: 15, height: 10 }, { x: 34, y: 60}),  // Heighliner
  hotspot(FOLDSPACE_BOARD_SPACE_ID, { left: 12, top: 40, width: 15, height: 10 }, { x: 34, y: 50}),  // Foldspace

  // === BENE GESSERIT ===
  hotspot(19, { left: 12, top: 53, width: 15, height: 10 }, { x: 34, y: 60}),   // Selective Breeding
  hotspot(18, { left: 12, top: 64, width: 15, height: 10 }, { x: 34, y: 50}),   // Secrets

  // === FREMEN ===
  hotspot(20, { left: 12, top: 78, width: 15, height: 10 }, { x: 34, y: 60}),  // Hardy Warriors
  hotspot(22, { left: 12, top: 89, width: 15, height: 10 }, { x: 34, y: 50}),  // Stillsuits
  hotspot(21, { left: 32, top: 45, width: 17, height: 11 }, { x: 30, y: 60 }),  // Sietch Tabr

  // === LANDSRAAD ===
  hotspot(9,  { left: 31, top: 1.5,  width: 31, height: 8 }, { x: 15, y: 52}),  // High Council
  hotspot(12, { left: 62, top: 1.5,  width: 13, height: 8 }, { x: 36, y: 52}),  // Hall of Oratory
  hotspot(10, { left: 31, top: 10, width: 16, height: 8 }, { x: 26, y: 50}),  // Mentat
  hotspot(13, { left: 62, top: 10, width: 13, height: 8 }, { x: 36, y: 52}),  // Swordmaster
  hotspot(11, { left: 48, top: 10, width: 14, height: 8 }, { x: 32, y: 52}),  // Rally Troops

  // === SPICE TRADE ===
  hotspot(8,  { left: 79, top: 1.5, width: 19, height: 8.0 }, { x: 25, y: 60}),   // Sell Melange
  hotspot(7,  { left: 79, top: 10.0, width: 19.0, height: 8.0 }, { x: 25, y: 60}),   // Secure Contract

  // === CITIES ===
  hotspot(1,  { left: 75, top: 24, width: 16, height: 13 }, { x: 30, y: 40 }),  // Arrakeen
  hotspot(2,  { left: 58, top: 27, width: 16, height: 13 }, { x: 30, y: 42 }),  // Carthag
  hotspot(3,  { left: 42, top: 36, width: 16, height: 9 }, { x: 30, y: 55 }),  // Research Station

  // === DESERT / ARRAKIS ===
  hotspot(4,  { left: 74, top: 39, width: 18, height: 13 }, { x: 28, y: 40 }),  // Imperial Basin
  hotspot(5,  { left: 29, top: 57, width: 17, height: 9 }, { x: 27, y: 50 }),  // The Great Flat
  hotspot(6,  { left: 55, top: 45, width: 17, height: 10 }, { x: 25, y: 50 }),  // Hagga Basin
]

const BASE_BOARD_SPACE_IDS = new Set(
  BOARD_SPACES.filter(space => !space.riseOfIx).map(space => space.id)
)

/** Hotspots visible for the current expansion flags. */
export function BOARD_HOTSPOTS_FOR_EXPANSIONS(expansions: Expansions): BoardHotspot[] {
  const layers = activeExpansionBoardHotspots(expansions)
  if (layers.length === 0) {
    return BOARD_HOTSPOTS.filter(h => BASE_BOARD_SPACE_IDS.has(h.spaceId))
  }
  return mergeBoardHotspots(BOARD_HOTSPOTS, layers)
}

/** Agent meeple center on the full stage (0–100%), from hotspot zone + relative anchor. */
export function layoutAgentAnchorPercent(h: BoardHotspot): { x: number; y: number } {
  const box = layoutHotspotPercent(h)
  return {
    x: box.left + box.width * (h.agentX / 100),
    y: box.top + box.height * (h.agentY / 100),
  }
}

function markerFromHotspot(h: BoardHotspot): MarkerAnchor {
  const p = layoutAgentAnchorPercent(h)
  return {
    spaceId: h.spaceId,
    x: p.x,
    y: p.y,
  }
}

export const MARKER_ANCHORS: MarkerAnchor[] = BOARD_HOTSPOTS.map(markerFromHotspot)

export function markerAnchorsForExpansions(expansions: Expansions): MarkerAnchor[] {
  const anchors = BOARD_HOTSPOTS_FOR_EXPANSIONS(expansions).map(markerFromHotspot)
  const extra = extraMarkerAnchorsForExpansions(expansions)
  return extra.length > 0 ? [...anchors, ...extra] : anchors
}

/**
 * Mentat availability token on the Mentat hotspot (stage %).
 * Derived from hotspot geometry so base and expansion retunes stay aligned.
 */
export function mentatAvailabilityPoint(h: BoardHotspot): { x: number; y: number } {
  const box = layoutHotspotPercent(h)
  return {
    x: box.left + box.width * 0.85,
    y: box.top + box.height * 0.6,
  }
}

/**
 * One eligibility dot per player who has not taken Swordmaster yet (stage %).
 * `laneIndex` is 0..laneCount-1 in ascending player id order.
 *
 * Dots stack **vertically** on the agent anchor (`agentX` / `agentY`) so RoI retunes
 * stay aligned with the printed icon without spilling into the CHOAM track.
 */
/**
 * Remaining Foldspace deck count on the Foldspace board space (stage %).
 * Derived from hotspot geometry so base and expansion retunes stay aligned.
 */
export function foldspaceDeckCountPoint(h: BoardHotspot): { x: number; y: number } {
  const box = layoutHotspotPercent(h)
  return {
    x: box.left + box.width * 0.72,
    y: box.top + box.height * 0.38,
  }
}

export function swordmasterEligibilityPoint(
  h: BoardHotspot,
  laneIndex: number,
  laneCount: number
): { x: number; y: number } {
  const box = layoutHotspotPercent(h)
  const anchorX = box.left + box.width * 0.80
  const anchorY = box.top + box.height * (h.agentY / 100)
  const spread = box.height * 0.35
  const startY = anchorY - spread * 0.5
  const t = laneCount <= 1 ? 0.5 : laneIndex / Math.max(1, laneCount - 1)
  return {
    x: anchorX,
    y: startY + spread * t,
  }
}

/** Aspect ratio of `Board.jpg` (width / height). Current asset: 1024×1024 → 1. */
export const BOARD_ASPECT_RATIO = 1
