# Task 03 — Board overlays, hotspots, tech-stacks modal & dreadnought icon

> Depends on Tasks 01 (flag) and 02 (types).
> Presentation / asset task plus a small `BOARD_SPACES` data addition.
> No new reducer behaviour beyond what Tasks 04 / 05 / 06 consume.

> ✦ 2026-06-10 — codebase drift since this plan was written:
>
> 1. **R7 is mostly done** — `client/public/icon/dreadnought.svg`
>    exists and is already used by `CombatAreaCluster`. No `.png`
>    export exists; standardize on the `.svg` (drop `.png` references).
> 2. **R8 is partially done** — `CombatAreaCluster.tsx`
>    (`ExpansionStrip`) already shows the per-player
>    dreadnought-in-conflict count. The old per-player "combat stat
>    rows" are gone: `CombatPlayerStat.tsx` is **orphaned** (unused)
>    and `COMBAT_RING_ANCHORS` is debug-only; production combat UI is
>    the `CombatAreaCluster` 2×2 grid anchored by `COMBAT_AREA_BOUNDS`.
> 3. **Modals** — `TechStacksModal` must use the new portal pattern:
>    `usePlayBoardModalPortal` + `PlayBoardModalContext`, with overlay
>    classes from `client/src/styles/playBoardModal.css` (see
>    `CombatResults` / `PlayerOverviewModal` for reference).
> 4. **Hotspots** — `boardHotspots.ts` now builds entries with a
>    `hotspot(spaceId, rect, agent)` factory that includes
>    `agentX`/`agentY` meeple anchors. New hotspots 23–26 must provide
>    agent anchors too (default `{ x: 50, y: 40 }` is applied if omitted).
> 5. **Sell Melange special flow** — `ImageBoard.tsx` has dedicated
>    `SellMelangePopup` wiring for space id 8
>    (`handleSellMelangeOptionSelect`). Disabling hotspot 8 under RoI
>    must also gate this popup path.

---

## 1. Goal

Render the Rise of Ix board changes on top of the existing `Board.jpg`:

- Overlay **`riseofix2.png`** on the **top-right** brown rectangle that
  currently shows **Sell Melange** and **Secure Contract** (ids 7–8).
  This graphic is the **CHOAM strip**: Smuggling, Interstellar Shipping,
  and the vertical **Freighter / shipping track** art (discs rendered in
  code — see [`05`](./05-freighter-shipping-track.md)).
- Overlay **`riseofix1.png`** on the **middle-top-left** free strip for
  the two **Landsraad** spaces: **Dreadnought** and **Tech Negotiation**.
  The three face-up tech tiles do **not** fit on the board — place a
  small control **next to** this overlay that opens a **Technology Stacks
  modal** (select stack → acquire). Render **tech negotiator counters**
  beside the same overlay (both next to and inside the modal).
- Add **hotspots** for all four new board spaces; **disable** hotspots
  for base spaces covered by `riseofix2` (Sell Melange, Secure Contract).
- Add a **dreadnought icon** (flat spaceship silhouette, `/icon/` style)
  for combat stats, garrison badges, and control markers.

**Assets not used in this task:** `riseofix3.png`, `riseofix4.png`
(superseded by 1 and 2 respectively).

---

## 2. Requirements

1. **R1 — Overlays gated by `expansions.riseOfIx`.**
   - `riseofix2.png` — CHOAM / spice-trade corner.
   - `riseofix1.png` — Dreadnought + Tech Negotiation strip.
   - Base `Board.jpg` always renders underneath.

2. **R2 — Overlay anchors.** Same `BOARD_VIEWPORT_INSETS` / percent
   system as `client/src/data/boardHotspots.ts`. New constants:
   - `CHOAM_OVERLAY_RECT` — `{ left, top, width, height }` for
     `riseofix2.png` (covers Sell Melange + Secure Contract).
   - `LANDSRAAD_IX_OVERLAY_RECT` — same shape for `riseofix1.png`
     (Dreadnought + Tech Negotiation only).

3. **R3 — New board spaces.** Four entries in `BOARD_SPACES`:

   | id | name | agentIcon | conflict | cost | reward / effects (see [`02`](./02-types-and-data-models.md)) |
   |---|---|---|---|---|---|
   | 23 | Dreadnought | LANDSRAAD | false | { solari: 3 } | dreadnoughts:1 **and/or** acquireTech (player chooses per rulebook p.6) |
   | 24 | Tech Negotiation | LANDSRAAD | false | – | acquireTech:{discount:1} **or** techNegotiator:1 (choose one) + Reveal: persuasion:1 while Agent here |
   | 25 | Smuggling | SPICE_TRADE | false | – | solari:1, freighter:1 |
   | 26 | Interstellar Shipping | SPICE_TRADE | false | – | requiresInfluence:{SG,2}, freighter:2 |

   - Each marked `riseOfIx: true` (Task 02).
   - Hotspot art aligns with overlay slices (`riseofix1` vs `riseofix2`),
     not separate per-space PNGs unless tuning needs them later.

4. **R4 — Hotspot disabling.** When `riseOfIx === true`:
   - Remove/disable hotspots for **Sell Melange** (id 8) and **Secure
     Contract** (id 7) — covered by `riseofix2`.
   - **Keep** Hall of Oratory and Swordmaster (not covered by either
     overlay).
   - Add hotspots for ids 23–26.
   - Implement `BOARD_HOTSPOTS_FOR_EXPANSIONS(expansions)` that filters
     covered base ids and unions RoI hotspots.

5. **R5 — Technology Stacks modal (not a full “Ix board”).**
   Component: `client/src/components/TechStacksModal/TechStacksModal.tsx`
   (name may vary; avoid implying freighter/CHOAM content).

   **Opened by:** a compact button anchored **next to**
   `LANDSRAAD_IX_OVERLAY_RECT` (same real estate as `riseofix1`), e.g.
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
   Beside `riseofix1` (not inside the modal): show per-player negotiator
   counts on Ix — coloured dots or small badges, sum =
   `players[i].negotiatorsOnIx`. Anchor via
   `NEGOTIATOR_COUNTERS_ANCHOR` in `boardMarkerAnchors.ts`.

7. **R7 — Dreadnought icon asset.** ✦ **DONE** —
   `client/public/icon/dreadnought.svg` exists and is referenced by
   `CombatAreaCluster`. No `.png` export needed; the `.svg` is the
   canonical asset.

8. **R8 — Dreadnought rendering on the board.**
   - ✦ **DONE**: conflict count — `CombatAreaCluster` `ExpansionStrip`
     already renders `player.dreadnoughts.conflict` with the svg icon.
   - Remaining: Arrakeen / Carthag / Imperial Basin dreadnought control
     icon (see [`04`](./04-dreadnoughts-and-units.md)) — render in the
     `ImageBoard` control-marker section (anchored by
     `CONTROL_MARKER_POINTS`), not in the combat cluster.
   - Remaining: Player overview garrison — troops and dreadnoughts side
     by side (`PlayerOverviewModal` and/or `CombatPlayerDetailModal`).

9. **R9 — Freighter discs on CHOAM overlay.** Vertical 0–3 track with
   per-player discs on `riseofix2`, anchored via
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
| `client/src/components/TechStacksModal/` (new) | 3-stack select + acquire UI — **must use `usePlayBoardModalPortal` + `playBoardModal.css` classes** (✦ new modal system) |
| `client/public/icon/dreadnought.svg` | ✦ already exists — reuse |
| `client/src/components/AgentIcon/AgentIcon.tsx` | `variant?: 'troop' \| 'dreadnought'` |
| `client/src/styles/playBoardModal.css` | ✦ add the TechStacksModal overlay class to the scoped-modal selector list |

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
      src="/board/riseofix/riseofix2.png"
      alt="CHOAM overlay"
      draggable={false}
      style={percentToStyle(layoutInnerRectPercent(CHOAM_OVERLAY_RECT))}
    />
    <img
      className="image-board__landsraad-ix-overlay"
      src="/board/riseofix/riseofix1.png"
      alt="Dreadnought and Tech Negotiation"
      draggable={false}
      style={percentToStyle(layoutInnerRectPercent(LANDSRAAD_IX_OVERLAY_RECT))}
    />
  </>
)}
```

**First-pass rects** (tune with `?hotspotDebug=1`):

```ts
// riseofix2 — top-right; covers Sell Melange + Secure Contract
export const CHOAM_OVERLAY_RECT = { left: 73, top: 0, width: 27, height: 22 }

// riseofix1 — middle-top-left; Dreadnought + Tech Negotiation only
export const LANDSRAAD_IX_OVERLAY_RECT = { left: 21, top: 0, width: 17, height: 22 }
```

### 4.2 Hotspot deltas

> ✦ 2026-06-10: use the existing `hotspot(spaceId, rect, agent?)`
> factory from `boardHotspots.ts` (it carries `agentX`/`agentY` meeple
> anchors; default `{ x: 50, y: 40 }`).

```ts
// riseofix1 — Landsraad strip
hotspot(23, { left: 56, top: 3.5, width: 11, height: 6 }),  // Dreadnought
hotspot(24, { left: 56, top: 12,  width: 11, height: 6 }),  // Tech Negotiation

// riseofix2 — CHOAM / spice-trade corner (replaces ids 7–8)
hotspot(25, { left: 78, top: 11, width: 11, height: 8 }),   // Smuggling
hotspot(26, { left: 78, top: 2,  width: 11, height: 8 }),   // Interstellar Shipping
```

Percentages are first-pass — align to art in `riseofix1.png` /
`riseofix2.png` under debug mode.

```ts
const VISIBLE_HOTSPOTS = (exp: Expansions) => {
  if (!exp.riseOfIx) return BOARD_HOTSPOTS.filter(h => h.spaceId < 23)
  return BOARD_HOTSPOTS
    .filter(h => h.spaceId !== 7 && h.spaceId !== 8) // Secure Contract, Sell Melange
    .concat(ROI_HOTSPOTS) // ids 23–26
}
```

> ✦ 2026-06-10: id mapping confirmed against current `boardHotspots.ts`:
> **7 = Secure Contract, 8 = Sell Melange**. When disabling id 8, also
> gate the `SellMelangePopup` flow in `ImageBoard.tsx`
> (`handleSellMelangeOptionSelect` / `showSellMelangePopup`) — it is a
> dedicated code path keyed to that space, not just a hotspot.

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
  counter display** (R6) is read-only totals beside `riseofix1`.
- ✦ 2026-06-10: implement with `usePlayBoardModalPortal` (board-scoped
  overlay; works with the play-chrome `scopeModalsToBoard` mode). Add
  the modal's overlay class to `playBoardModal.css`. Reference
  implementations: `CombatResults`, `PlayerOverviewModal`,
  `ConflictSelect`.

### 4.4 Board chrome next to `riseofix1`

```
[ riseofix1 overlay: Dreadnought | Tech Negotiation ]
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
2. **AC2** — `riseOfIx === true`: `riseofix2.png` covers Sell Melange +
   Secure Contract per `CHOAM_OVERLAY_RECT`; `riseofix1.png` covers
   Dreadnought + Tech Negotiation per `LANDSRAAD_IX_OVERLAY_RECT`.
3. **AC3** — `?hotspotDebug=1`: outlines for ids 23–26 on overlay art;
   ids 7–8 not clickable.
4. **AC4** — Tech Stacks button beside `riseofix1` opens modal with three
   stacks; Acquire dispatches `ACQUIRE_TECH`.
5. **AC5** — Negotiator counters visible beside overlay when
   `negotiatorsOnIx > 0` (or always show zeros — product choice).
6. **AC6** — ✦ already satisfied: `/icon/dreadnought.svg` loads and
   `CombatAreaCluster` shows the dreadnought count when
   `dreadnoughts.conflict > 0` (verify it still holds after changes).
7. **AC7** — Freighter discs on `riseofix2` track (coordination with Task 05).
8. **AC8** — Pre-existing tests pass.

---

## 6. Unit tests

> ✦ 2026-06-10: component (`.tsx`) tests need jsdom +
> `@testing-library/react`, which are **not installed** (vitest env is
> `node`). Either add them per [`11-tests-overview.md`](./11-tests-overview.md)
> §4-notes, or park these specs in `client/src/__tests__/deferred/`
> (excluded from the normal run) until the deps land. Modal tests must
> wrap `PlayBoardModalProvider`.

**Path:** `client/src/components/ImageBoard/__tests__/overlay.test.tsx`

- [ ] No RoI overlays when `expansions.riseOfIx` is false
- [ ] Renders `riseofix2.png` and `riseofix1.png` when true
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

- **Overlay ↔ base board mapping (confirmed):** `riseofix2` replaces
  **Sell Melange** and **Secure Contract** only. Hall of Oratory and
  Swordmaster stay. `riseofix1` adds **Dreadnought** and **Tech
  Negotiation** on the middle-top-left strip — it does **not** replace
  other base spaces.
- **Technology UI split:** Interactive 3-stack **select + acquire** =
  modal via button next to `riseofix1`. Decorative tech-market art on
  `riseofix2` (if present in the PNG) is not wired to state.
- **Dreadnought icon:** Longer aspect ratio than troop; distinct at a glance.
- **Thumbnails:** Reuse `client/public/technologies/rise_of_ix/*.png`.
- **Deprecated assets:** Do not reference `riseofix3.png` or
  `riseofix4.png` in implementation; keep files in repo for reference only.
