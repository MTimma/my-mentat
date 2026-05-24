# Task 03 — CHOAM overlay, Ix board panel, hotspots & dreadnought icon

> Depends on Tasks 01 (flag) and 02 (types).
> Pure presentation / asset task plus a small `BOARD_SPACES` data
> addition. No new reducer behaviour beyond what Task 04 / 05 / 06
> will use.

---

## 1. Goal

Render the Rise of Ix board changes on top of the existing `Board.jpg`:

- Overlay the **CHOAM board** (`/board/riseofix/riseofix1.png`) on the
  top-right corner of the base board, covering the original Landsraad
  / Spice Trade area there.
- Overlay the **Ix board** (`/board/riseofix/riseofix3.png`) on a free
  area at the middle-top-left of the base board. Per user instruction
  the Ix board's 3 face-up tech tiles will not fit on the board image
  itself — surface them via **a button next to the Ix overlay** that
  opens an Ix Board Panel modal (or a sidebar).
- Add **hotspots** for the 4 new CHOAM-overlay board spaces:
  Dreadnought, Tech Negotiation, Smuggling, Interstellar Shipping.
- Add an **Ix board panel** that lists the 3 face-up tech tiles, the
  Negotiator zone, and per-player Freighter positions.
- Create a **dreadnought icon** (a simple flat spaceship silhouette in
  the existing `/icon/` style) and use it consistently for combat-stat
  rows, garrison badges, and control space markers.

---

## 2. Requirements

1. **R1 — Overlays gated by `expansions.riseOfIx`.** `riseofix1.png`
   (CHOAM overlay) and `riseofix3.png` (Ix board) only render when the
   flag is on. The base board image continues to render underneath in
   all cases.
2. **R2 — Overlay anchors.** Overlays use the same
   `BOARD_VIEWPORT_INSETS` / percent system in
   `client/src/data/boardHotspots.ts` so they re-flow with the board
   resize. New constants:
   - `CHOAM_OVERLAY_RECT` — `{ left, top, width, height }` in inner
     board 0–100 space.
   - `IX_OVERLAY_RECT` — same shape.
3. **R3 — New board spaces.** Add 4 entries to `BOARD_SPACES`:
   | id | name | agentIcon | conflict | cost | reward / effects (see [`02`](./02-types-and-data-models.md)) |
   |---|---|---|---|---|---|
   | 23 | Dreadnought | LANDSRAAD | false | { solari: 3 } | dreadnoughts:1 **and/or** acquireTech (player chooses one or both per rulebook p.6) |
   | 24 | Tech Negotiation | LANDSRAAD | false | – | acquireTech:{discount:1} **or** techNegotiator:1 (choose one) + Reveal: persuasion:1 while Agent here |
   | 25 | Smuggling | SPICE_TRADE | false | – | solari:1, freighter:1 |
   | 26 | Interstellar Shipping | SPICE_TRADE | false | – | requiresInfluence:{SG,2}, freighter:2 |
   - Mark each with `riseOfIx: true` (new flag from Task 02).
   - Image fields point to `/board/riseofix/<slug>.png` (overlay slices)
     — see §4.2.
   - The CHOAM overlay covers the existing High Council / Hall of Oratory
     area? **No** — read carefully: the rulebook says the CHOAM overlay
     covers the **original Landsraad and CHOAM sections of the top-right
     corner**. The base board’s top-right corner houses Sell Melange,
     Secure Contract, Hall of Oratory, Swordmaster. After overlay, those
     spaces are **replaced** by the four new spaces above.
     > ⚠ Verify against the physical board before final implementation.
     > In our base board (`Board.jpg` ~1024×1024) the **top-right cluster**
     > is `id 8 Sell Melange`, `id 7 Secure Contract`, `id 12 Hall of
     > Oratory`, `id 13 Swordmaster`. The rulebook does **not** replace
     > Hall of Oratory or Swordmaster; the rulebook’s overlay only
     > replaces the **Landsraad → CHOAM** spice trade corner. ✱
     > **Action:** keep Hall of Oratory and Swordmaster active. Replace
     > only the spice-trade corner — Sell Melange & Secure Contract on
     > our board are pre-overlay; the new spaces (Smuggling, Interstellar
     > Shipping) **stack alongside** them.
     > Treat this as paraphrase-risk: see §7.
4. **R4 — Hotspot disabling.** When `riseOfIx === true`, the
   pre-overlay hotspots in the covered corner (Sell Melange + Secure
   Contract) **remain placeable** because the rulebook doesn’t replace
   them, just relocates the visual layout. ✱ See §7.
   When the user manages to verify the physical overlay covers them,
   add a filter `BOARD_HOTSPOTS_FOR_EXPANSIONS(expansions)` that omits
   the covered ids and unions with the RoI hotspots.
5. **R5 — Ix board panel.** A new component
   `client/src/components/IxBoardPanel/IxBoardPanel.tsx` renders:
   - Header: "Ix Board".
   - Three columns (stacks). Top of each stack shows the face-up tech
     tile’s image (`/technologies/rise_of_ix/<id>.png`), name, cost, and
     `Acquire` button (button is disabled in time-travel view).
   - Negotiator zone: shows total negotiators on Ix as a player-coloured
     dot row.
   - Freighter strip: a 0..3 vertical track with per-player dots.
   The panel is opened by a small "Ix Board" button in the
   `ImageBoard` overlay, anchored to the centre of `IX_OVERLAY_RECT`.
6. **R6 — Dreadnought icon asset.** Add
   `client/public/icon/dreadnought.png` (and `.svg`) — a flat top-down
   spaceship silhouette in the same line-art style as
   `/icon/troop.png` and `/icon/dagger.png`. Per user request the icon
   should "look like a basic spaceship figure". Dimensions match
   existing icon files (~32–64 px square, transparent background).
   - SVG version added so it can be tinted per player colour via CSS
     `mask-image` if we later choose to. Initial use is `<img>` tag,
     unprocessed.
7. **R7 — Dreadnought rendering on the board.**
   - In `ImageBoard.tsx`’s combat-stat rows (`image-board__combat-stat`):
     after the troop count, also render the dreadnought count when
     `player.dreadnoughts.conflict > 0`, using the new icon.
   - On the Arrakeen / Carthag / Imperial Basin spaces: when a
     dreadnought controls the space (see [`04`](./04-dreadnoughts-and-units.md)),
     render a coloured dreadnought icon **instead of** the existing
     control marker dot.
   - On the garrison badges in the player overview modal: show
     `troops × <troop>  dreadnoughts × <dreadnought>` side by side.
8. **R8 — Freighter rendering on the CHOAM overlay.** A vertical
   3-step track with per-player coloured discs. Anchored via a new
   constant `SHIPPING_TRACK_ANCHORS: { x: number; ySteps: number[] }`
   inside `boardMarkerAnchors.ts`.

---

## 3. Files touched

| File | Change |
|---|---|
| `client/src/data/boardHotspots.ts` | Add `CHOAM_OVERLAY_RECT`, `IX_OVERLAY_RECT`, 4 new entries in `BOARD_HOTSPOTS` (gated to RoI only by Task 04). |
| `client/src/data/boardMarkerAnchors.ts` | Add `DREADNOUGHT_CONTROL_POINTS: Record<ControlMarkerType, {x,y}>` and `SHIPPING_TRACK_ANCHORS`. |
| `client/src/data/boardSpaces.ts` | Add ids 23–26 (Dreadnought, Tech Negotiation, Smuggling, Interstellar Shipping). |
| `client/src/components/ImageBoard/ImageBoard.tsx` | Render overlays conditional on `expansions.riseOfIx`; render dreadnought icons; render freighter discs; render "Open Ix Board" button. |
| `client/src/components/ImageBoard/ImageBoard.css` | Styles for `.image-board__choam-overlay`, `.image-board__ix-overlay`, `.image-board__freighter-disc`, `.image-board__ix-board-btn`. |
| `client/src/components/IxBoardPanel/IxBoardPanel.tsx` (new) | The panel/modal described in R5. |
| `client/src/components/IxBoardPanel/IxBoardPanel.css` (new) | Styles for the panel. |
| `client/public/icon/dreadnought.svg` (new) | The new dreadnought icon (SVG source). |
| `client/public/icon/dreadnought.png` (new) | Rendered raster export (32 px and 64 px optional). |
| `client/src/components/AgentIcon/AgentIcon.tsx` | Add optional `variant?: 'troop' \| 'dreadnought'` to render the dreadnought instead of the troop figure. Required for Task 04 board rendering. |

> No files removed. All visual changes default off when
> `expansions.riseOfIx === false`.

---

## 4. Detailed design

### 4.1 Overlay rendering

Inside `ImageBoard.tsx`, add right after the `<img>` board image:

```tsx
{state.expansions?.riseOfIx && (
  <>
    <img
      className="image-board__choam-overlay"
      src="/board/riseofix/riseofix1.png"
      alt="CHOAM board overlay"
      draggable={false}
      style={percentToStyle(layoutInnerRectPercent(CHOAM_OVERLAY_RECT))}
    />
    <img
      className="image-board__ix-overlay"
      src="/board/riseofix/riseofix3.png"
      alt="Ix board"
      draggable={false}
      style={percentToStyle(layoutInnerRectPercent(IX_OVERLAY_RECT))}
    />
  </>
)}
```

`percentToStyle` is a tiny helper that maps `{left, top, width, height}`
to inline `style`.

**Initial guesses** for the rects (must be fine-tuned with
`?hotspotDebug=1`):

```ts
export const CHOAM_OVERLAY_RECT = { left: 73, top: 0, width: 27, height: 22 }
export const IX_OVERLAY_RECT    = { left: 21, top: 0, width: 17, height: 22 }
```

> These are first-pass values. Visual tuning is part of acceptance.

### 4.2 Hotspot deltas

Append to `BOARD_HOTSPOTS`:

```ts
// === RISE OF IX — CHOAM overlay (Spice Trade corner)
{ spaceId: 25, left: 78, top: 11, width: 11, height: 8 },  // Smuggling
{ spaceId: 26, left: 78, top: 2,  width: 11, height: 8 },  // Interstellar Shipping
// === RISE OF IX — CHOAM overlay (Landsraad strip)
{ spaceId: 23, left: 56, top: 3.5, width: 11, height: 6 }, // Dreadnought
{ spaceId: 24, left: 56, top: 12,  width: 11, height: 6 }, // Tech Negotiation
```

> Again, percentages are first-pass — the actual placement depends on
> where the `riseofix1.png` graphic puts the spaces. Tune with
> `?hotspotDebug=1`.

When `expansions.riseOfIx === false` the four new ids are skipped via
a filter:

```ts
const VISIBLE_HOTSPOTS = (exp: Expansions) =>
  exp.riseOfIx ? BOARD_HOTSPOTS : BOARD_HOTSPOTS.filter(h => h.spaceId < 23)
```

### 4.3 Ix board panel layout

```
┌─ Ix Board ───────────────────────────┐
│ Stack 1     Stack 2     Stack 3      │
│ [tile img]  [tile img]  [tile img]   │
│  Disposal    Holtzman   Spy          │
│   3 spice    6 spice    4 spice      │
│   [Acquire]  [Acquire]  [Acquire]    │
│                                      │
│ Negotiators on Ix: ● ● ● ● (4 total) │
│                                      │
│ Shipping track:                      │
│   3 ─── [R] [G]                      │
│   2 ─── [Y]                          │
│   1 ─── [B]                          │
│   0 ─── (empty)                      │
└──────────────────────────────────────┘
```

- Negotiator dots are coloured per player (sum of
  `players[i].negotiatorsOnIx`).
- Shipping track shows each player's `freighterStep`.

Each Acquire button dispatches `{ type: 'ACQUIRE_TECH', playerId, tileId, negotiatorsReturned }`
to the reducer. **Action shape and reducer logic** are defined in
[`06-tech-tiles.md`](./06-tech-tiles.md). This task only ships the UI
wiring (dispatch call sites).

### 4.4 Dreadnought icon

Asset spec — flat, mono-colour silhouette so it can be tinted per
player via `filter: drop-shadow(...)` or `mask-image`:

- SVG view box `0 0 64 64`.
- Pure black fill, transparent background.
- One canonical "spaceship" silhouette: an elongated diamond / arrow
  shape with two side fins and a small command tower bump on top — see
  `/icon/troop.png` for stylistic reference.
- Exported sizes: 64 px primary; rasterise 32 px for high-density
  fallback if needed.

Implementation note: place the SVG source in
`client/public/icon/dreadnought.svg`. Build process does not transform
public assets; the file ships as-is.

### 4.5 AgentIcon variant

`AgentIcon.tsx` currently renders the agent figure (troop). Extend it:

```ts
interface BoardAgentFigureProps {
  playerId: number
  className?: string
  variant?: 'troop' | 'dreadnought' // default 'troop'
}
```

When `variant === 'dreadnought'` render the dreadnought silhouette
instead of the troop one, tinted via the same per-player colour map
already in use.

### 4.6 Control marker → dreadnought visual

When a player has a dreadnought on Arrakeen / Carthag / Imperial Basin
(`player.dreadnoughts.control.includes(<key>)`), the existing
`image-board__tracker-circle--control` should render the dreadnought
icon overlay instead of (or in addition to) the dot.

A minimal approach: keep the dot, but add an
`image-board__tracker-dreadnought` element on top with `z-index: 1`,
showing the icon. The dot still indicates ownership colour.

---

## 5. Acceptance criteria

1. **AC1** — With `expansions.riseOfIx === false`, the `ImageBoard`
   renders pixel-identical to today (no overlays, no extra hotspots).
2. **AC2** — With `expansions.riseOfIx === true`,
   `riseofix1.png` overlays the top-right corner area defined by
   `CHOAM_OVERLAY_RECT`, and `riseofix3.png` overlays the middle-top-left
   area defined by `IX_OVERLAY_RECT`.
3. **AC3** — `?hotspotDebug=1` shows magenta outlines for the four
   new hotspots (ids 23–26) and they overlay the visible space art.
4. **AC4** — Clicking the "Open Ix Board" button anchored over the Ix
   overlay opens the `IxBoardPanel` with three stacks, a negotiator
   total, and a freighter track.
5. **AC5** — `/icon/dreadnought.svg` and `/icon/dreadnought.png` exist
   and load (no 404 in DevTools network).
6. **AC6** — `BoardAgentFigure variant="dreadnought" playerId={0}`
   renders the dreadnought silhouette tinted with player 0's colour.
7. **AC7** — When a player has `dreadnoughts.conflict > 0`, the combat
   stat row in `image-board__combat-stat` renders a dreadnought count
   to the right of the troop count.
8. **AC8** — Pre-existing tests pass without modification.

---

## 6. Unit tests

**Path:** `client/src/components/ImageBoard/__tests__/overlay.test.tsx` (new)

- [ ] `renders no riseofix overlay when expansions.riseOfIx is false`
- [ ] `renders riseofix1.png and riseofix3.png when expansions.riseOfIx is true`
- [ ] `omits hotspots id >= 23 when expansions.riseOfIx is false`
- [ ] `renders hotspots id 23..26 when expansions.riseOfIx is true`

**Path:** `client/src/components/IxBoardPanel/__tests__/IxBoardPanel.test.tsx` (new)

- [ ] `renders 3 stacks based on state.ixBoard.stacks`
- [ ] `renders a face-up tile name and Acquire button for each non-empty stack`
- [ ] `clicking Acquire dispatches { type: "ACQUIRE_TECH", ... }`
- [ ] `negotiator dot count equals sum of player.negotiatorsOnIx`
- [ ] `freighter discs render at the row matching player.freighterStep`

**Path:** `client/src/components/AgentIcon/__tests__/variant.test.tsx` (new)

- [ ] `variant="dreadnought" renders the dreadnought icon path`
- [ ] `variant defaults to "troop"`

---

## 7. Notes / paraphrase risk

- **Which base spaces does CHOAM overlay cover?** The user's note says
  "covers the top right corner of image board" and the rulebook says
  "Landsraad and CHOAM sections". Our `Board.jpg` packs Hall of Oratory
  (12), Sell Melange (8), Swordmaster (13), Secure Contract (7) in
  that corner area. The cleanest model: **all four base spaces remain
  active alongside the four new RoI spaces**, since the rulebook does
  not say to remove them. Visually the printed overlay reshapes the
  Landsraad strip and the Spice Trade strip — we approximate by
  overlaying `riseofix1.png` on top and accepting that the *icons*
  beneath are hidden by the PNG. Hotspots stay clickable thanks to
  transparent buttons over the PNG.
- **Dreadnought icon style.** Match `/icon/troop.png` (silhouette,
  no gradients). Keep it visually distinct (longer aspect ratio, with
  fins) so a player can tell them apart at a glance.
- **Tech tile thumbnails.** Each tile has an existing PNG under
  `client/public/technologies/rise_of_ix/`. Reuse those — no need to
  regenerate.
- **`riseofix2.png` / `riseofix4.png`.** Not referenced in this task
  on purpose: 2 looks like the back of the Ix board and 4 looks like
  an alt CHOAM strip variant — defer their use until visual tuning,
  optionally swap with 1/3 if they fit better.
