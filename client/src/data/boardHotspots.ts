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
  { spaceId: 14, left: 12, top: 5, width: 11, height: 8 },   // Conspire
  { spaceId: 15, left: 12, top: 15, width: 11, height: 8 },   // Wealth

  // === SPACING GUILD ===
  { spaceId: 17, left: 12, top: 30, width: 11, height: 8 },  // Heighliner
  { spaceId: 16, left: 12, top: 40, width: 11, height: 8 },  // Foldspace

  // === BENE GESSERIT ===
  { spaceId: 19, left: 12, top: 55, width: 11, height: 8 },   // Selective Breeding
  { spaceId: 18, left: 12, top: 65, width: 11, height: 8 },   // Secrets

  // === FREMEN ===
  { spaceId: 20, left: 12, top: 80, width: 11, height: 8 },  // Hardy Warriors
  { spaceId: 22, left: 12, top: 90, width: 11, height: 8},  // Stillsuits
  { spaceId: 21, left: 32, top: 48, width: 11, height: 8 },  // Sietch Tabr

  // === LANDSRAAD ===
  { spaceId: 9,  left: 30, top: 3.5,  width: 11, height: 6 },  // High Council
  { spaceId: 12, left: 63, top: 3.5,  width: 11, height: 5 },  // Hall of Oratory
  { spaceId: 10, left: 31, top: 12, width: 11, height: 6 },  // Mentat
  { spaceId: 13, left: 64, top: 12, width: 11, height: 6 },  // Swordmaster
  { spaceId: 11, left: 48, top: 12, width: 11, height: 6 },  // Rally Troops

  // === SPICE TRADE ===
  { spaceId: 8,  left: 78, top: 2.3, width: 11.0, height: 8.0 },   // Sell Melange
  { spaceId: 7,  left: 78, top: 11.0, width: 11.0, height: 8.0 },   // Secure Contract

  // === CITIES ===
  { spaceId: 1,  left: 75, top: 25, width: 11, height: 8 },  // Arrakeen
  { spaceId: 2,  left: 57, top: 28, width: 11, height: 8 },  // Carthag
  { spaceId: 3,  left: 42, top: 37, width: 11, height: 8 },  // Research Station

  // === DESERT / ARRAKIS ===
  { spaceId: 4,  left: 75, top: 40, width: 11, height: 9 },  // Imperial Basin
  { spaceId: 5,  left: 30, top: 57, width: 11, height: 9 },  // The Great Flat
  { spaceId: 6,  left: 55, top: 45, width: 11, height: 9 },  // Hagga Basin
]

function markerFromHotspot(h: BoardHotspot): MarkerAnchor {
  const p = layoutHotspotPercent(h)
  return {
    spaceId: h.spaceId,
    x: p.left + p.width * 0.5,
    y: p.top + p.height * 0.4,
  }
}

export const MARKER_ANCHORS: MarkerAnchor[] = BOARD_HOTSPOTS.map(markerFromHotspot)

/** Aspect ratio of `Board.jpg` (width / height). Current asset: 1024×1024 → 1. */
export const BOARD_ASPECT_RATIO = 1
