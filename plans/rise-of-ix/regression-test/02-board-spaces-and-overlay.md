# Board spaces & Ix overlay

Base game has 22 spaces. Rise of Ix adds **4 CHOAM spaces** (ids 23–26), an **Ix board panel** (tech stacks), and **overlays** on the main board image.

## Space table

| ID | Name | Agent | Cost / gate | Effects |
|----|------|-------|-------------|---------|
| 23 | Dreadnought | Landsraad | 3 solari | +1 dreadnought, Acquire Tech |
| 24 | Tech Negotiation | Landsraad | — | Acquire Tech (−1 discount), +1 negotiator on Ix |
| 25 | Smuggling | Spice Trade | — | +1 solari, +1 freighter |
| 26 | Interstellar Shipping | Spice Trade | SG influence ≥ 2 | +2 freighter |

## Availability rules

When `riseOfIx === true`:

- Spaces **7 (Secure Contract)** and **8 (Sell Melange)** are **unavailable** (covered by CHOAM overlay).
- Spaces **23–26** require `riseOfIx`.

Automated: `boardSpaceAvailability.test.ts`.

## Hotspots & markers

| ID | Check | File |
|----|-------|------|
| BS-01 | Every `BOARD_SPACES` entry has `BOARD_HOTSPOTS` | `boardSpaces.test.ts` |
| BS-02 | RoI hotspot ids 23–26 present when expansions include RoI | `boardHotspots.test.ts` |
| BS-03 | Hotspot coords ⊆ [0,100] | `boardLayout.test.ts` (deferred) |
| BS-04 | `riseOfIx: true` on space records 23–26 | `boardSpaces.ts` |

## Overlay assets

| Asset | Region |
|-------|--------|
| `riseofix2.png` | CHOAM corner (spaces 23–26) |
| `riseofix1.png` | Landsraad strip (Dreadnought + Tech Negotiation) |
| Tech Stacks button | Beside `riseofix1` overlay |

Component tests: **todo** in `ImageBoard/__tests__/overlay.test.tsx` (see `plans/rise-of-ix/11-tests-overview.md`).

## Behavior todos

| ID | Space | Behavior to verify |
|----|-------|-------------------|
| BS-10 | Dreadnought | Pay 3 solari before place; commission OR deploy choice at combat spaces |
| BS-11 | Tech Negotiation | Discount stacks with negotiator return on acquire |
| BS-12 | Smuggling | Freighter choice appears in turn controls after agent resolve |
| BS-13 | Interstellar Shipping | Blocked when SG influence < 2; two sequential freighter choices |
| BS-14 | Tech Stacks modal | Shows 3 stacks; Acquire dispatches `ACQUIRE_TECH` |

## UI scenarios

Hosted click paths: [10-ui-regression.md](./10-ui-regression.md) **UI-BOARD-*** series.

Debug: `?hotspotDebug=1`, `?markerDebug=1` (same as base).
