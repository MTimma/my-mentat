# Interactive full-board image (`Board.jpg`)

## Current state

- `GameBoard` lays out **`BoardSpace`** components in a CSS grid (`board-spaces`).
- Each space uses its own asset under `public/board/` (e.g. `high_council.png`), not the full `Board.jpg`.
- Game logic is keyed by stable **`space.id`** and `BOARD_SPACES` in `boardSpaces.ts` — that contract can stay; only presentation and hit-testing change.

## Goal

- One full `Board.jpg` as the visual.
- **Clickable regions** per board space (replacing the grid of cutouts).
- **Counters** (agents, influence cubes, VP/combat markers, troops, etc.) at fixed positions on the art.

## What we need

### 1. Board stage with fixed geometry

- Wrapper that preserves the **same aspect ratio** as `Board.jpg` (e.g. `aspect-ratio` from real dimensions).
- All overlays use the **same coordinate system** — typically **percentages of width/height** (or normalized 0–1) so layout scales on resize.

### 2. Hotspots per board space

- Mapping: **`space.id` → hit region** on the image.
- **Rectangles** (`left`, `top`, `width`, `height` as % of the board) are enough for most spaces.
- **Polygons** (SVG or multiple rects) if shapes are skewed or need a tighter fit.

**Implementation options:**

- Stack: `position: relative` → `<img>` or `background-image` → absolutely positioned transparent `<button>` / `<div role="button">` per space (% positioning).
- SVG overlay: `<svg viewBox="...">` with embedded board image + `<rect>` / `<polygon>` and `pointer-events`.
- `<map>` / `<area>`: possible but awkward for responsive % coordinates.

**Authoring:** Measure once (design tool, image editor, or a small dev tool: click corners → export JSON). Store alongside board config (e.g. `boardHotspots` data).

### 3. Anchor points for counters (separate from click areas)

| Use | Notes |
|-----|--------|
| Agents on spaces | One anchor (or stack region) per `space.id` |
| Faction influence | 4 tracks × 5 steps → fixed points |
| Victory points | Points for 0–12 on VP track |
| Combat strength | Points for 1–20 on combat track |
| Troops / conflict | Map to combat circles and per-location garrison areas as per game rules |

Render as absolutely positioned elements at the same % coordinates (e.g. center anchors with `transform: translate(-50%, -50%)`).

### 4. Wiring to existing behavior

- Keep `handleSpaceClick`, `canPayCosts`, `highlightedAreas`, `occupiedSpaces`, `blockedSpaces`, Sell Melange popup, Selective Breeding, Voice, etc.
- Only **`GameBoard` presentation** changes: one image + overlays that invoke the same handlers with `space.id`.

### 5. UX / technical notes

- **Pointer events:** Avoid the `<img>` capturing clicks (`pointer-events: none` on the image if controls sit above).
- **Touch / a11y:** Minimum tap targets (~44px) may require slightly larger hit rects than the printed art; consider focus rings for keyboard users.
- **Responsive:** If using `object-fit: contain` + letterboxing, overlays must align to the **same box** as the visible image, not the viewport.

## Summary

Three deliverables:

1. Responsive, aspect-locked frame with `Board.jpg`.
2. **Hotspot map:** `space.id` → region(s) for clicks.
3. **Marker map:** normalized positions for influence, VP, combat, agents, troops, etc.

Existing **`BOARD_SPACES` IDs** remain the integration seam between data and UI.
