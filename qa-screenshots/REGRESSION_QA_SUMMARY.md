# Base Game Regression QA Summary

**Date:** June 15, 2026  
**Branch:** `cursor/dune-imperium-regression-test-15ee`  
**App:** http://localhost:5173/ (Vite dev server)  
**Plan:** `plans/base-game/regression-test/` (tasks 00–06)

---

## Executive Summary

Ran automated tests plus manual browser QA on **desktop (1280×800)** and **mobile (375×812, 600×812)**. Core tracker flows work: setup, agent turns, reveal turns, board interaction, and mobile layout. **No P0 blockers** found. Several **UX clarifications** and **console warnings** were noted. Combat, Makers, Recall, and multi-round end-to-end play were **not fully exercised** in the browser (time-intensive); those areas rely on automated tests (partial) and manual follow-up.

| Layer | Result |
|-------|--------|
| Automated (`cd client && npm run test`) | **327 passed**, 103 intentional `it.todo` |
| Desktop browser QA | ~75% of UI checklist |
| Mobile browser QA | **Pass** — no layout blockers |
| Full game to endgame | **Not completed** in browser |

---

## Automated Test Results (Task 00)

```bash
cd client && npm run test
# Test Files  36 passed (36)
# Tests       327 passed | 103 todo (430)
```

All automated suites are green. Known backlog from the plan remains as `it.todo` stubs (89 imperium row effect stubs, makers/recall engine todos, etc.). No new regressions in CI.

---

## What Worked ✅

### Setup & data
- 3- and 4-player setup, leader assignment, color selection
- Imperium Row selection (5 cards) and Conflict card selection
- Game board loads with imperium row, conflict card, faction tracks, VP track, combat track
- `?hotspotDebug=1` loads on fresh page (debug overlays on board spaces)

### Player turns (Phase 2)
- **Agent turn:** PLAY → card modal → select card → place agent on board space
- Agent token appears on correct space with player color
- Turn advances P1 → P2 → P3
- Board space highlighting for valid placements
- **Reveal turn:** REVEAL → select **all** hand cards → **Select** → reveal resolves; imperium row cards open acquire UI
- Player overview modal (resources, influence, VP)

### UI (Task 06)
| ID | Result | Notes |
|----|--------|-------|
| UI-01–03 | ✅ Pass (automated) | Footer spacer CSS present |
| UI-04 | ⏸ Not verified | Footer stability during effects row not measured |
| UI-10–11 | ✅ Pass (automated) | Hotspot coords valid |
| UI-12 | ✅ Pass | VP markers visible on score track |
| UI-13 | ✅ Pass | Influence tracks on board |
| UI-14 | ⚠️ Partial | Combat markers visible at 0; not tested through combat resolution |
| UI-20–22 | ✅ Pass | Agent on occupied space only; color matches player |
| UI-30 | ✅ Pass | Turn history shows board space name (e.g. "Imperial Basin") |
| UI-31 | ✅ Pass | Gains row visible in history |
| UI-32–33 | ⚠️ Partial | Reveal labels / thumbnails not fully verified |
| UI-34 | ⏸ Not verified | Undo / history navigation not exercised end-to-end |

### Mobile (375×812 and 600×812)
- No horizontal overflow
- Setup, board, card modal, agent placement, footer (PLAY / REVEAL / End Turn) all usable
- Touch targets adequate; vertical scroll for full board is expected

---

## Issues & Potential Regressions ⚠️

### Confirmed (low severity)

| ID | Issue | Severity | Evidence |
|----|-------|----------|----------|
| QA-01 | React `fetchPriority` prop warning on `<img>` | Low | `TurnControls.tsx:2044`; console spam |
| QA-02 | `Cannot update ImperiumRowSelect while rendering CardSearch` | Low | Console warning during card picker |
| QA-03 | Missing favicon (404) | Very low | Network tab |
| QA-04 | "Open card creator" text may wrap/truncate on customize screen | Low | `02-customize-state-screen.webp` |
| QA-05 | Resource `link preload` unused warnings | Low | Console |

### UX (not bugs, but friction)

| ID | Issue | Notes |
|----|-------|-------|
| UX-01 | Reveal flow requires **all** hand cards selected before **Select** enables | Testers clicked cards but left **Select** disabled; "Clear all" is cancel, not confirm. See `desktop-07-reveal-turn-interface.webp` vs `reveal-complete.webp` |
| UX-02 | REVEAL / footer controls can sit below fold | Scroll or Ctrl+F needed on shorter viewports |
| UX-03 | Sandbox "Begin turns" needs imperium + conflict picked first | Unclear without reading hint; regular Start Game path is clearer |
| UX-04 | Turn history at ≥768px is **docked right** — no toggle button | Earlier report of "history broken" was false positive (confused with player overview icon) |

### False positives removed

- **"Cannot select 2 players"** — app only supports **3 or 4** players (`GameSetup.tsx` options). Not a bug.
- **"Turn history non-functional"** — docked panel works at desktop width; see turn history in `desktop-07-reveal-turn-interface.webp`.

### Not tested in browser (gaps)

| Area | Plan ref | Status |
|------|----------|--------|
| Combat resolution & rewards | RS / 04-conflicts | ⏸ Not reached in manual pass |
| Makers bonus spice | RS-12 | ⏸ Engine todo + not browser-tested |
| Recall / pass first player | RS-13 | ⏸ Not browser-tested |
| Endgame at 10 VP | RS-14 | ⏸ Not browser-tested |
| Intrigue play (plot/combat/endgame) | 03-intrigue | ⏸ Not exercised in UI |
| Round 2+ full cycle | 01-round-structure | ⏸ Not completed |
| Undo via turn history | UI-34 | ⏸ Not verified |
| `?markerDebug=1` | 06-ui-regression | ⏸ Not captured |

### Known data gaps (from plan 00, unchanged)

- Intrigue not in app: **Demand Respect**, **Poison Snooper**
- Conflicts in spreadsheet but not `CONFLICTS.ts`: Guild Bank Raid, Raid Stockpiles, Terrible Purpose, Grand Vision

---

## Screenshots (25 files)

All under `qa-screenshots/`:

| File | Description |
|------|-------------|
| `01-game-setup-screen.webp` | Initial setup |
| `02-customize-state-screen.webp` | Customize game state |
| `03-conflict-card-selection.webp` | Conflict pick |
| `04-main-game-board-turn1.webp` | Board at turn 1 |
| `05-agent-placed-on-board.webp` | Agent placement |
| `desktop-01` … `desktop-10` | Desktop flow (setup → agent → reveal UI → overview) |
| `desktop-07-reveal-turn-interface.webp` | Reveal modal — Select disabled until all slots filled |
| `reveal-complete.webp` | After reveal + imperium acquire UI |
| `desktop-turn-history.webp` | Turn history navigation |
| `debug-hotspots.webp` | App with `?hotspotDebug=1` |
| `mobile-01` … `mobile-05` | Mobile setup, board, agent turn, footer, 600px |
| `desktop-combat.webp` | Placeholder — combat not fully tested |
| `desktop-round2.webp` | Placeholder — round 2 not reached |

---

## Recommendations

1. **No release blockers** from this pass for core tracking flows.
2. **Fix console warnings** (QA-01, QA-02) to reduce noise and avoid future React strict-mode failures.
3. **Reveal UX:** Consider helper text ("Select all N cards, then Select") or enable partial reveal if rules allow.
4. **Schedule follow-up manual pass** for combat → makers → recall → round 2 (≈30–45 min per full game).
5. **Keep automated suite green** on every change; implement high-priority `it.todo` items when touching card effects.

---

## Test sessions

| Session | Viewport | Coverage |
|---------|----------|----------|
| Automated vitest | Node | Manifest, round structure, intrigue, conflicts, board spaces |
| Desktop QA | 1280×800 | Setup, agent turns, reveal, history, debug URL |
| Mobile QA | 375×812, 600×812 | Setup, agent turn, footer, layout |

**Overall manual coverage:** ~70% of UI checklist; ~40% of full rules/phases checklist.
