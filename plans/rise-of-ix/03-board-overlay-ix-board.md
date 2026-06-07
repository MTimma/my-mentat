# Task 03 — Board overlays, hotspots, tech-stacks modal & dreadnought icon

> Depends on Tasks 01 (flag) and 02 (types).
> Presentation / asset task plus a small `BOARD_SPACES` data addition.
> No new reducer behaviour beyond what Tasks 04 / 05 / 06 consume.

---

## 1. Goal

Render the Rise of Ix board changes on top of the existing `Board.jpg`:

- Overlay **`riseofix4.png`** on the **top-right** brown rectangle that
  currently shows **Sell Melange** and **Secure Contract** (ids 7–8).
  This graphic is the **CHOAM strip**: Smuggling, Interstellar Shipping,
  and the vertical **Freighter / shipping track** art (discs rendered in
  code — see [`05`](./05-freighter-shipping-track.md)).
- Overlay **`riseofix3.png`** on the **middle-top-left** free strip for
  the two **Landsraad** spaces: **Dreadnought** and **Tech Negotiation**.
  The three face-up tech tiles do **not** fit on the board — place a
  small control **next to** this overlay that opens a **Technology Stacks
  modal** (select stack → acquire). Render **tech negotiator counters**
  beside the same overlay (both next to and inside the modal).
- Add **hotspots** for all four new board spaces; **disable** hotspots
  for base spaces covered by `riseofix4` (Sell Melange, Secure Contract).
- Add a **dreadnought icon** (flat spaceship silhouette, `/icon/` style)
  for combat stats, garrison badges, and control markers.

**Assets not used in this task:** `riseofix1.png`, `riseofix2.png`
(superseded by 4 and 3 respectively).

---

## 2. Requirements

1. **R1 — Overlays gated by `expansions.riseOfIx`.**
   - `riseofix4.png` — CHOAM / spice-trade corner.
   - `riseofix3.png` — Dreadnought + Tech Negotiation strip.
   - Base `Board.jpg` always renders underneath.

2. **R2 — Overlay anchors.** Same `BOARD_VIEWPORT_INSETS` / percent
   system as `client/src/data/boardHotspots.ts`. New constants:
   - `CHOAM_OVERLAY_RECT` — `{ left, top, width, height }` for
     `riseofix4.png` (covers Sell Melange + Secure Contract).
   - `LANDSRAAD_IX_OVERLAY_RECT` — same shape for `riseofix3.png`
     (Dreadnought + Tech Negotiation only).

3. **R3 — New board spaces.** Four entries in `BOARD_SPACES`:

   | id | name | agentIcon | conflict | cost | reward / effects (see [`02`](./02-types-and-data-models.md)) |
   |---|---|---|---|---|---|
   | 23 | Dreadnought | LANDSRAAD | false | { solari: 3 } | dreadnoughts:1 **and/or** acquireTech (player chooses per rulebook p.6) |
   | 24 | Tech Negotiation | LANDSRAAD | false | – | acquireTech:{discount:1} **or** techNegotiator:1 (choose one) + Reveal: persuasion:1 while Agent here |
   | 25 | Smuggling | SPICE_TRADE | false | – | solari:1, freighter:1 |
   | 26 | Interstellar Shipping | SPICE_TRADE | false | – | requiresInfluence:{SG,2}, freighter:2 |

   - Each marked `riseOfIx: true` (Task 02).
   - Hotspot art aligns with overlay slices (`riseofix3` vs `riseofix4`),
     not separate per-space PNGs unless tuning needs them later.

4. **R4 — Hotspot disabling.** When `riseOfIx === true`:
   - Remove/disable hotspots for **Sell Melange** (id 8) and **Secure
     Contract** (id 7) — covered by `riseofix4`.
   - **Keep** Hall of Oratory and Swordmaster (not covered by either
     overlay).
   - Add hotspots for ids 23–26.
   - Implement `BOARD_HOTSPOTS_FOR_EXPANSIONS(expansions)` that filters
     covered base ids and unions RoI hotspots.

5. **R5 — Technology Stacks modal (not a full “Ix board”).**
   Component: `client/src/components/TechStacksModal/TechStacksModal.tsx`
   (name may vary; avoid implying freighter/CHOAM content).

   **Opened by:** a compact button anchored **next to**
   `LANDSRAAD_IX_OVERLAY_RECT` (same real estate as `riseofix3`), e.g.
   label “Tech” or stack icon. Disabled in time-travel view.

   **Modal contents only:**
   - Three columns = the three Ix stacks from `state.ixBoard.stacks`.
   - Each column: face-up tile image (`/technologies/rise_of_ix/<id>.png`),
     name, spice cost, **Acquire** (and negotiator-return UI per
     [`06`](./06-tech-tiles.md)).
   - Player picks **which stack** to buy from; reducer handles pop +
     reveal-next.

   **Not in this modal:** freighter track, CHOAM rewards, generic “Ix
   board” chrome — those live on the board overlay ([`05`](./05-freighter-shipping-track.md))
   or other tasks.

6. **R6 — Tech negotiator counters on the board.**
   Beside `riseofix3` (not inside the modal): show per-player negotiator
   counts on Ix — coloured dots or small badges, sum =
   `players[i].negotiatorsOnIx`. Anchor via
   `NEGOTIATOR_COUNTERS_ANCHOR` in `boardMarkerAnchors.ts`.

7. **R7 — Dreadnought icon asset.** `client/public/icon/dreadnought.svg`
   (+ `.png` export): flat top-down spaceship silhouette, same line-art
   feel as `/icon/troop.png`. Optional SVG for future `mask-image` tint.

8. **R8 — Dreadnought rendering on the board.**
   - Combat stat rows: dreadnought count when `player.dreadnoughts.conflict > 0`.
   - Arrakeen / Carthag / Imperial Basin: dreadnought control icon (see
     [`04`](./04-dreadnoughts-and-units.md)).
   - Player overview garrison: troops and dreadnoughts side by side.

9. **R9 — Freighter discs on CHOAM overlay.** Vertical 0–3 track with
   per-player discs on `riseofix4`, anchored via
   `SHIPPING_TRACK_ANCHORS` in `boardMarkerAnchors.ts` ([`05`](./05-freighter-shipping-track.md)).

---

## 3. Files touched

| File | Change |
|---|---|
| `client/src/data/boardHotspots.ts` | `CHOAM_OVERLAY_RECT`, `LANDSRAAD_IX_OVERLAY_RECT`; hotspots 23–26; expansion filter |
| `client/src/data/boardMarkerAnchors.ts` | `DREADNOUGHT_CONTROL_POINTS`, `SHIPPING_TRACK_ANCHORS`, `NEGOTIATOR_COUNTERS_ANCHOR` |
| `client/src/data/boardSpaces.ts` | ids 23–26 |
| `client/src/components/ImageBoard/ImageBoard.tsx` | Overlays, dreadnought icons, freighter discs, negotiator counters, Tech Stacks button |
| `client/src/components/ImageBoard/ImageBoard.css` | Overlay + marker styles |
| `client/src/components/TechStacksModal/` (new) | 3-stack select + acquire UI |
| `client/public/icon/dreadnought.svg` (new) | Icon asset |
| `client/public/icon/dreadnought.png` (new) | Raster export |
| `client/src/components/AgentIcon/AgentIcon.tsx` | `variant?: 'troop' \| 'dreadnought'` |

> All visual changes default off when `expansions.riseOfIx === false`.

---

## 4. Detailed design

### 4.1 Overlay rendering

Inside `ImageBoard.tsx`, after the base board `<img>`:

```tsx
{state.expansions?.riseOfIx && (
  <>
    <img
      className="image-board__choam-overlay"
      src="/board/riseofix/riseofix4.png"
      alt="CHOAM overlay"
      draggable={false}
      style={percentToStyle(layoutInnerRectPercent(CHOAM_OVERLAY_RECT))}
    />
    <img
      className="image-board__landsraad-ix-overlay"
      src="/board/riseofix/riseofix3.png"
      alt="Dreadnought and Tech Negotiation"
      draggable={false}
      style={percentToStyle(layoutInnerRectPercent(LANDSRAAD_IX_OVERLAY_RECT))}
    />
  </>
)}
```

**First-pass rects** (tune with `?hotspotDebug=1`):

```ts
// riseofix4 — top-right; covers Sell Melange + Secure Contract
export const CHOAM_OVERLAY_RECT = { left: 73, top: 0, width: 27, height: 22 }

// riseofix3 — middle-top-left; Dreadnought + Tech Negotiation only
export const LANDSRAAD_IX_OVERLAY_RECT = { left: 21, top: 0, width: 17, height: 22 }
```

### 4.2 Hotspot deltas

```ts
// riseofix3 — Landsraad strip
{ spaceId: 23, left: 56, top: 3.5,  width: 11, height: 6 }, // Dreadnought
{ spaceId: 24, left: 56, top: 12,   width: 11, height: 6 }, // Tech Negotiation

// riseofix4 — CHOAM / spice-trade corner (replaces ids 7–8)
{ spaceId: 25, left: 78, top: 11,  width: 11, height: 8 }, // Smuggling
{ spaceId: 26, left: 78, top: 2,   width: 11, height: 8 }, // Interstellar Shipping
```

Percentages are first-pass — align to art in `riseofix3.png` /
`riseofix4.png` under debug mode.

```ts
const VISIBLE_HOTSPOTS = (exp: Expansions) => {
  if (!exp.riseOfIx) return BOARD_HOTSPOTS.filter(h => h.spaceId < 23)
  return BOARD_HOTSPOTS
    .filter(h => h.spaceId !== 7 && h.spaceId !== 8) // Sell Melange, Secure Contract
    .concat(ROI_HOTSPOTS) // ids 23–26
}
```

### 4.3 Technology Stacks modal

```
┌─ Technology market ──────────────────┐
│  Stack 1      Stack 2      Stack 3   │
│  [tile img]   [tile img]   [tile img]  │
│  Disposal     Holtzman     Spy         │
│  3 spice      6 spice      4 spice     │
│  [Acquire]    [Acquire]    [Acquire]   │
└──────────────────────────────────────┘
```

- One **Acquire** per non-empty stack; dispatch
  `{ type: 'ACQUIRE_TECH', playerId, tileId, negotiatorsReturned, discount }`
  ([`06-tech-tiles.md`](./06-tech-tiles.md)).
- Negotiator-return controls live in the modal acquire flow; **board-side
  counter display** (R6) is read-only totals beside `riseofix3`.

### 4.4 Board chrome next to `riseofix3`

```
[ riseofix3 overlay: Dreadnought | Tech Negotiation ]
[ Tech stacks btn ]  [ negotiator dots: ●● per player ]
```

Button opens §4.3 modal only.

### 4.5 Dreadnought icon & AgentIcon variant

Same as before: SVG `0 0 64 64`, black silhouette, reference `/icon/troop.png`.
`BoardAgentFigure` / `AgentIcon` gains `variant?: 'troop' | 'dreadnought'`.

### 4.6 Control marker → dreadnought visual

When `player.dreadnoughts.control` includes the space key, render
dreadnought icon on the control anchor (dot + icon or icon-only per
visual tuning).

---

## 5. Acceptance criteria

1. **AC1** — `riseOfIx === false`: board pixel-identical to today (no
   overlays, no extra hotspots, no Tech button).
2. **AC2** — `riseOfIx === true`: `riseofix4.png` covers Sell Melange +
   Secure Contract per `CHOAM_OVERLAY_RECT`; `riseofix3.png` covers
   Dreadnought + Tech Negotiation per `LANDSRAAD_IX_OVERLAY_RECT`.
3. **AC3** — `?hotspotDebug=1`: outlines for ids 23–26 on overlay art;
   ids 7–8 not clickable.
4. **AC4** — Tech Stacks button beside `riseofix3` opens modal with three
   stacks; Acquire dispatches `ACQUIRE_TECH`.
5. **AC5** — Negotiator counters visible beside overlay when
   `negotiatorsOnIx > 0` (or always show zeros — product choice).
6. **AC6** — `/icon/dreadnought.svg` loads; combat row shows dreadnought
   count when `dreadnoughts.conflict > 0`.
7. **AC7** — Freighter discs on `riseofix4` track (coordination with Task 05).
8. **AC8** — Pre-existing tests pass.

---

## 6. Unit tests

**Path:** `client/src/components/ImageBoard/__tests__/overlay.test.tsx`

- [ ] No RoI overlays when `expansions.riseOfIx` is false
- [ ] Renders `riseofix4.png` and `riseofix3.png` when true
- [ ] Hotspots 7–8 omitted when true; 23–26 present
- [ ] Tech Stacks button rendered when true

**Path:** `client/src/components/TechStacksModal/__tests__/TechStacksModal.test.tsx`

- [ ] Renders 3 stacks from `state.ixBoard.stacks`
- [ ] Face-up tile + Acquire per non-empty stack
- [ ] Acquire dispatches `ACQUIRE_TECH`
- [ ] Does **not** render freighter track (belongs on board / Task 05)

**Path:** `client/src/components/AgentIcon/__tests__/variant.test.tsx`

- [ ] `variant="dreadnought"` uses dreadnought asset
- [ ] Default variant is troop

---

## 7. Notes

- **Overlay ↔ base board mapping (confirmed):** `riseofix4` replaces
  **Sell Melange** and **Secure Contract** only. Hall of Oratory and
  Swordmaster stay. `riseofix3` adds **Dreadnought** and **Tech
  Negotiation** on the middle-top-left strip — it does **not** replace
  other base spaces.
- **Technology UI split:** Interactive 3-stack **select + acquire** =
  modal via button next to `riseofix3`. Decorative tech-market art on
  `riseofix4` (if present in the PNG) is not wired to state.
- **Dreadnought icon:** Longer aspect ratio than troop; distinct at a glance.
- **Thumbnails:** Reuse `client/public/technologies/rise_of_ix/*.png`.
- **Deprecated assets:** Do not reference `riseofix1.png` or
  `riseofix2.png` in implementation; keep files in repo for reference only.
