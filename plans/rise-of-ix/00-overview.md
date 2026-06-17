# Rise of Ix — Implementation Plan (Overview)

This folder contains the implementation plan for adding the **Rise of Ix** expansion
on top of the existing Dune: Imperium base implementation in the `my-mentat`
React/TypeScript codebase.

> **App context — read first.** `my-mentat` is a **logging / database tool** for
> playing Dune: Imperium *by hand*. The user steps through each turn manually,
> can customize decks, can rewind/replay turns, and saves the game so it can be
> shown to other players. It is **not** a full game engine, and the user has
> stated that a hot-seat / fully-playable mode is not required for this work.
>
> All design choices below must respect that: we extend the reducer to **track
> the new state** (dreadnoughts, freighter, tech tiles, negotiators, snoopers,
> shipping rewards) and **render the new board and cards**, but anywhere the
> base game already relies on the player to make a decision and the reducer
> simply records the outcome, we mirror that approach for Rise of Ix.

---

## 1. Sources used

1. The internal cursor note at [`.cursor/rise_of_ix`](../../.cursor/rise_of_ix)
   provided by the user (cards + tech + intrigues + leaders tables).
2. The official Rise of Ix rulebook PDF
   ([cloudfront link](https://d19y2ttatozxjp.cloudfront.net/pdfs/DUNE_IMPERIUM_RISE_OF_IX_Rulebook_22-2-11.pdf))
   for board spaces, dreadnoughts, freighter / shipping track, tech tile rules,
   unit terminology, Unload, Infiltration, Tech Negotiation and Epic mode.
3. The expansion clarifications doc (Google Docs link in `.cursor/rise_of_ix`).
4. Asset inventory in
   `client/public/board/riseofix/`,
   `client/public/imperium_row/rise_of_ix/`,
   `client/public/intrigue/rise_of_ix/`,
   `client/public/conflicts/cards/rise_of_ix/`,
   `client/public/technologies/rise_of_ix/`,
   `client/public/leaders/rise_of_ix/`.

> ⚠ Some Rise of Ix card / tech text in the cursor note is paraphrased.
> A few rows include `?` (e.g. "Web of Power: +1 inf ?"). Where text is
> ambiguous we mark the field as `// TODO: verify printed card text` in
> the relevant plan and leave the reducer handling generic (manual gain).
> Double-check against the printed card before final implementation.

---

## 1b. Status update (2026-06-10) — codebase drift & existing groundwork

The plans were written 2026-05-31. Since then the codebase received a large
play-board UX refactor and a small amount of Rise of Ix groundwork already
landed (commit `687eaff "Add Rise of Ix components"`). Each plan file now
carries inline `> ✦ 2026-06-10` corrections; the global picture:

**Already in the codebase (plans must extend, not re-create):**

- `Player.dreadnoughts?: { supply, garrison, conflict }` in
  `client/src/types/GameTypes.ts` — optional, **no `control` zone yet**.
- `client/src/utils/dreadnoughts.ts` — `PlayerDreadnoughts` type +
  `getDreadnoughtsInConflict(player)`.
- `client/public/icon/dreadnought.svg` (SVG only; no `.png` export —
  code standardizes on the `.svg`).
- `CombatAreaCluster` (`client/src/components/ImageBoard/CombatAreaCluster.tsx`)
  already renders the per-player dreadnought-in-conflict count
  (`ExpansionStrip`) and hosts the troop deploy strip.
- All image assets: `board/riseofix/*.png`, 18 tech tile PNGs,
  RoI leaders / imperium row / intrigue / conflict art.

**Refactor facts every task must respect:**

1. **Board modals** go through `client/src/context/PlayBoardModalContext.tsx`
   + `client/src/hooks/usePlayBoardModalPortal.ts` +
   `client/src/styles/playBoardModal.css`. Any new RoI modal
   (Tech Stacks, freighter status, …) must use this portal pattern.
2. **Combat rendering** is the `CombatAreaCluster` 2×2 grid anchored by
   `COMBAT_AREA_BOUNDS` (`boardMarkerAnchors.ts`); `COMBAT_RING_ANCHORS`
   is debug-only and `CombatPlayerStat.tsx` is orphaned (unused).
3. **Troop deploy controls** live in
   `CombatAreaCluster` → `CombatTroopControls` (wired from `App.tsx`
   through `ImageBoard`), **not** in `TurnControls`. The undo action is
   `UNDEPLOY_TROOP` (`RETREAT_TROOP` exists but is the *effect* retreat).
4. **Conflict tier filtering** happens in `App.tsx` (~line 1129), not in
   `ConflictSelect.tsx` (which is now a portal-aware dumb renderer).
5. **Hotspots** in `boardHotspots.ts` are built with a
   `hotspot(id, rect, agent)` factory carrying `agentX/agentY` anchors.
6. **Reducer test helpers** already exist:
   `client/src/components/GameContext/__tests__/_helpers.ts`
   (`getBaseTestState`, `makePlayer`, …). Vitest runs from `client/`,
   environment `node` (no jsdom / testing-library), and
   `src/__tests__/deferred/**` is excluded from the run.

**Corrected base-game facts** (wrong in the original plan text):

- Base `IMPERIUM_ROW_DECK` has **67** cards, not 64.
- Base `CONFLICTS` (ids 901–918) tier mix is **4 / 10 / 4**, not 4 / 8 / 4.
- `Leader` is a **class** (constructor-defined), not an interface, with
  `complexity: 1 | 2 | 3`.

---

## 2. Master scope (what Rise of Ix adds)

| Area | Base game | Rise of Ix change |
|---|---|---|
| Board | 22 spaces | + **4 new spaces** on a CHOAM overlay (Dreadnought, Tech Negotiation, Smuggling, Interstellar Shipping) covering the top-right corner. Plus a **new Ix board panel** to the left/elsewhere. |
| Resources tracked per player | troops, spice, water, solari, persuasion, intrigue count, deck/discard/hand | + **dreadnoughts in supply/garrison/conflict/control space** (2 each), + **freighter position 0–3 on shipping track**, + **tech tiles owned** (with face-up/face-down state), + **negotiators on Ix** (troops temporarily placed for Tech discount), + **snooper tokens on influence tracks** (Tessia Vernius only). |
| Imperium cards | base set | + **29 new cards** (paraphrased table — rulebook says 35 incl. duplicates). |
| Intrigue cards | 32 base | + **17 new cards**. |
| Conflict cards | 18 base | + **4 new cards** (2 Skirmish I, 1 tier II, 1 tier III) and Conflict Deck rules change to **10 cards: 1 × I, 5 × II, 4 × III**. |
| Leaders | 8 base | + **6 new leaders** (Rhombur, Hudro, Yuna, Armand, Ilesa, Tessia; Baron Vladimir Harkonnen is also reprinted but the base game already has him). |
| Tech tiles | none | + **18 unique tech tiles** acquired from a 3-stack Ix board, with various timings (Reveal / Round Start / Endgame / Once per Round / Always). |
| New mechanics | n/a | Dreadnought, Freighter / Shipping rewards, Acquire Tech, Tech Negotiation / Negotiators, Unload (Reveal triggers on discard or trash), Discard (cost from hand), Unit = troop ∪ dreadnought, Snooper tokens. |
| Epic Game mode | n/a | Optional flag (out of scope for first pass — see `01-feature-flag-and-setup.md`). |

---

## 3. Plan files in this folder

| File | Topic | Status |
|---|---|---|
| `00-overview.md` | This document. | – |
| `01-feature-flag-and-setup.md` | The `riseOfIx` toggle, where it is stored, how it flows from setup → GameState → UI. | TODO |
| `02-types-and-data-models.md` | All `GameTypes.ts` extensions (`AgentIcon`, `Reward`, `Cost`, `Player`, `GameState`, etc.). | TODO |
| `03-board-overlay-ix-board.md` | CHOAM overlay PNG composition, hotspots for new spaces, Ix board side panel, **dreadnought icon asset** creation. | TODO |
| `04-dreadnoughts-and-units.md` | Reducer & UI for dreadnoughts; “units” = troop ∪ dreadnought; control-space replacement; durability through combat. | TODO |
| `05-freighter-shipping-track.md` | Reducer & UI for Freighter on the 4-step Shipping track; recall rewards (Dividends, troops+influence, +2 spice / Acquire Tech with -2). | TODO |
| `06-tech-tiles.md` | The 18 tiles, Ix board state, acquire cost, negotiators, per-tile reducer hooks. | TODO |
| `07-leaders.md` | The 6 new leaders (and their unique mechanics: snoopers, freighter signet, etc.). | TODO |
| `08-imperium-row-cards.md` | Per-card data + reducer analysis for each new Imperium Row card. | TODO |
| `09-intrigue-cards.md` | Per-card data + reducer analysis for each new Intrigue card. | TODO |
| `10-conflict-cards.md` | The 4 new Conflict cards + the new tier mix (1 / 5 / 4) when the toggle is on. | TODO |
| `11-tests-overview.md` | Test strategy: where to add Vitest specs and what to cover at minimum. | TODO |
| `regression/` | Rule/unit-test matrix and manual multi-game UI regression checklist for Rise of Ix. | TODO |

Each task file in this folder follows the **same standard structure**:

```
1. Goal
2. Requirements (numbered, atomic, testable)
3. Files touched (table)
4. Detailed design (per area)
5. Acceptance criteria (numbered, observable)
6. Unit tests (file path + “it” cases as a checklist)
7. Notes / open questions / paraphrase risk
```

This lets each plan be handed to a single agent / engineer.

---

## 4. Recommended execution order

Tasks have inter-dependencies. Suggested order (top to bottom):

1. **01 — Feature flag + setup wiring.** Without this, no other work can be gated.
2. **02 — Types and data models.** All later work depends on the new
   `AgentIcon`, `Reward`, `Cost`, `Player`, `GameState` fields.
3. **03 — Board overlay, Ix board panel, dreadnought icon asset.** Visual
   scaffolding is small and unlocks 04 / 05 / 06.
4. **04 — Dreadnoughts and units.** Needed before many cards/conflicts work.
5. **05 — Freighter / Shipping track.** Needed before many cards work.
6. **06 — Tech tiles.** Needed before many cards work.
7. **07 — Leaders.** Standalone (uses 02 + 04 + 05 + 06).
8. **08 — Imperium row cards.** Uses 02 + 04 + 05 + 06.
9. **09 — Intrigue cards.** Uses 02 + 04 + 06.
10. **10 — Conflict cards.** Uses 02 + 04.
11. **11 — Tests overview.** Cross-cutting; can be done in parallel with 08/09/10.

---

## 5. Cross-cutting principles

1. **Logging-tool first.** Every reducer change must keep the “step through
   turns” story working — including time travel, undo, and the existing
   `history` snapshots in `GameState`. If a new piece of state cannot be
   cleanly snapshotted, prefer a simpler representation.
2. **Toggle isolation.** When `riseOfIx === false`, the codebase must behave
   exactly as today. Any new state field defaults to “off / empty / zero”.
   Snapshots of pre-existing games (no `riseOfIx` field) must still load.
3. **Card analysis bias.** For each new card we explicitly answer:
   - Can the effect be expressed in `Reward` / `Cost` only? → declarative.
   - Does it need a new `CustomEffect`? → reducer hook + UI prompt.
   - Is it pure tracking with no automation (e.g. "look at top 2 intrigue,
     keep one")? → mark as **manual** and surface a UI hint to the user
     (similar to how some base intrigue cards are already handled).
4. **No secrets in source.** Asset filenames are public; no env vars are
   required for this feature. If we ever add a remote sync, we will reuse
   existing env vars rather than introduce new ones in this work.
5. **Paraphrase risk.** Many card texts in `.cursor/rise_of_ix` are
   abbreviated. Each plan file flags where the reducer-level decision
   hinges on a possibly-paraphrased text and asks for verification.

---

## 6. Out of scope for this plan

- **Epic Game mode** (Control the Spice, 12 VP win, etc.). The toggle is
  designed to accept a future `epic` sub-flag but no Epic logic is planned
  here — keep the room and stop.
- **Solo / Two-Player Rival automation** (House Hagal). 
- **Immortality / Uprising** (per user instruction).
- **Hot-seat playability beyond what already exists.** Logging-only.

---

## 7. Glossary (terms used throughout the plan files)

- **Unit** — either a troop or a dreadnought (used by some new cards).
- **Commission** — placing a dreadnought from supply into garrison
  (or directly into the Conflict if you just sent an Agent to a combat space).
- **Negotiator** — a troop temporarily placed on the Ix board to reduce a
  future Tech tile cost by 1 spice each.
- **Unload** — a Reveal box that fires not only on a Reveal turn but also
  when the card is discarded or trashed.
- **Infiltration** — special Agent icon that lets you place onto a space
  already occupied by enemy Agents (cards with `infiltrate: true` already
  exist in code; we extend the icon set).
- **Freighter** — a player-coloured disc on the CHOAM Shipping track.
- **Acquire Tech (-1, -2)** — Acquire Tech icon with a built-in spice
  discount on one tile.
