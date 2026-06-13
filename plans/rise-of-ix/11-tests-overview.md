# Task 11 — Tests overview & scaffolding

> Cross-cutting. Aggregates the per-task test lists from 01–10 into a
> single execution / coverage plan, and sets the test-style standards.

> ✦ 2026-06-10 — current test infrastructure facts:
>
> 1. **`_helpers.ts` already exists**
>    (`client/src/components/GameContext/__tests__/_helpers.ts`) with
>    `getBaseTestState`, `makePlayer`, `stubDeckCard`, `withCardOnTop`,
>    `snapshotAfterAgentTurn`. §4.1's `getRoiTestState` is an
>    **extension** of this file, not a new one.
> 2. **Tests run from `client/`** (`cd client && npm run test`); there
>    is no root `package.json`.
> 3. **Vitest environment is `node`**, not jsdom; `@testing-library/*`
>    is not installed. Component (`.tsx`) tests need
>    `jsdom` + `@testing-library/react` + `@testing-library/jest-dom`
>    and a per-file `// @vitest-environment jsdom` pragma (or env
>    override for `*.test.tsx`).
> 4. **`client/src/__tests__/deferred/`** exists and is **excluded**
>    from the normal run (`vite.config.ts`); UI specs can be parked
>    there until the jsdom deps land.
> 5. **`client/src/data/__tests__/` does not exist.** Keep data-level
>    tests under `GameContext/__tests__/` (the codebase convention;
>    plans 08/10 were updated to match), or create the directory once
>    and document it here.
> 6. **No coverage script exists** — add
>    `"test:coverage": "vitest run --coverage"` + `@vitest/coverage-v8`
>    if §5's ≥90% goal is to be enforced.
> 7. **Post-refactor reducer test template:** see
>    `boardSpaceCostGains.test.ts` (uses `getGainsForTurnState`) and
>    `imperiumRowCards.test.ts` (manifest-driven `it.todo` scaffold).
> 8. **Modal component tests** must wrap `PlayBoardModalProvider`
>    (ConflictSelect / ImperiumRowSelect / TechStacksModal are
>    portal-based).

---

## 1. Goal

Define the test surface for the Rise of Ix work so the implementing
agents don't drift apart. All tests use the existing **Vitest** setup
(`client/package.json` → `"test": "vitest run"`).

---

## 2. Test categories

| Category | Where | Mechanism |
|---|---|---|
| **Pure functions** | `client/src/utils/__tests__/*` (✦ `data/__tests__/` doesn't exist — data assertions go in `GameContext/__tests__/`) | Synchronous assertions on return values. |
| **Reducer slice tests** | `client/src/components/GameContext/__tests__/*` | Use `applyGameAction(state, action)` and `getFreshDefaultGameState()` helpers (already used in `intrigueCards.test.ts`); extend the existing `_helpers.ts`. |
| **Component tests** | `client/src/components/<Component>/__tests__/*.test.tsx` | Use `vitest` + `@testing-library/react` (✦ not installed; needs jsdom env too — see header note 3, or park in `src/__tests__/deferred/`). |
| **Snapshot tests for history** | Reducer slice tests with `state.history.length` and `state.history[i].expansions` assertions. | – |

---

## 3. Suite plan (consolidated from 01–10)

> Items prefixed `[ ]` are required for "done".

### 3.1 Setup & flag (Task 01)

- [ ] `expansionsFlag.test.ts` — default, seeded, undo, history.
- [ ] `buildImperiumDeck.test.ts` — length & uniqueness.
- [ ] `conflictPool.test.ts` — length & tier counts.
- [ ] `leaderPool.test.ts` — length.

### 3.2 Types & helpers (Task 02)

- [ ] `utils/__tests__/dreadnoughts.test.ts` (✦ renamed from
  `units.test.ts`) — `unitsInConflictForPlayer`.
- [ ] `techTiles.test.ts` (data — ✦ under `GameContext/__tests__/`) —
  18 entries, image paths.

### 3.3 Board overlays, tech-stacks modal & dreadnought icon (Task 03)

**`ImageBoard/__tests__/overlay.test.tsx`**

- [ ] No RoI overlays when `expansions.riseOfIx` is false
- [ ] Renders `riseofix4.png` (CHOAM) and `riseofix3.png` (Landsraad
  strip) when true — not `riseofix1` / `riseofix2`
- [ ] Hotspots 7–8 (Sell Melange, Secure Contract) omitted when true;
  hotspots 23–26 present
- [ ] Tech Stacks button rendered beside `riseofix3` overlay when true
- [ ] Negotiator counter UI reflects sum of `players[*].negotiatorsOnIx`
  (smoke)

**`TechStacksModal/__tests__/TechStacksModal.test.tsx`**

- [ ] Renders 3 stacks from `state.ixBoard.stacks`
- [ ] Face-up tile name/image + Acquire per non-empty stack
- [ ] Acquire dispatches `{ type: 'ACQUIRE_TECH', ... }`
- [ ] Does **not** render freighter track (Task 05 / `riseofix4` board)

**`AgentIcon/__tests__/variant.test.tsx`**

- [ ] `variant="dreadnought"` uses dreadnought asset path
- [ ] Default variant is `troop`

### 3.4 Dreadnoughts (Task 04)

- [ ] `dreadnoughts.test.ts` — commission, deploy, conflict, control,
  cover.
- [ ] `combatStrength.test.ts` — formula.

### 3.5 Freighter (Task 05)

- [ ] `freighter.test.ts` — advance, recall, dividends, persistence.

### 3.6 Tech tiles (Task 06)

- [ ] `techTiles.test.ts` (reducer) — acquire, round start flip,
  per-tile effect.

### 3.7 Leaders (Task 07)

- [ ] `rhombur.test.ts` / `hudroIntriguePeek.test.ts` /
  `yunaSolariBonus.test.ts` / `armand.test.ts` / `ilesa.test.ts` /
  `tessia.test.ts`.

### 3.8 Imperium row cards (Task 08)

- [ ] `riseOfIxCards.test.ts` — one `it` per card.

### 3.9 Intrigue cards (Task 09)

- [ ] `riseOfIxIntrigue.test.ts` — one `it` per card.

### 3.10 Conflicts (Task 10)

- [ ] `conflictsRiseOfIx.test.ts` + `conflictRewards.test.ts`.

---

## 4. Helpers we recommend adding

### 4.1 `getRoiTestState()`

Inside `client/src/components/GameContext/__tests__/_helpers.ts`
(✦ **existing file** — extend it; it already provides
`getBaseTestState` / `makePlayer`), with the flag on and the right
player seeds:

```ts
export function getRoiTestState(opts?: { players?: number }): GameState {
  const players = opts?.players ?? 1
  const s = getFreshDefaultGameState()
  return {
    ...s,
    expansions: { riseOfIx: true, riseOfIxEpic: false },
    players: Array.from({ length: players }, (_, i) => makePlayer(i, {
      dreadnoughts: { supply: 2, garrison: 0, conflict: 0, control: [] },
      freighterStep: 0,
      tech: [],
      negotiatorsOnIx: 0,
      snoopers: {},
    })),
    ixBoard: { stacks: makeIxStacks(), nextFaceUpRevealed: { 0: true, 1: true, 2: true } },
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
  }
}
```


### 4.3 `playRoiCard(state, name)`

For category-A card tests, a thin wrapper that finds the card by
name in `RISE_OF_IX_IMPERIUM_DECK`, puts it on top of the player's
deck, dispatches `PLAY_CARD` and `PLACE_AGENT` (where relevant) so the
test body can just assert.

---

## 5. Coverage target

- **Reducer** (`GameContext.tsx` + `riseOfIxReducer.ts`) RoI lines:
  ≥ 90% line coverage.
- **Pure helpers** (`utils/dreadnoughts.ts` ✦, `utils/combatStrength.ts`,
  `data/leaderAbilities/*.ts`): 100% line coverage.
- **UI components** (board overlays, `TechStacksModal`, deploy-strip
  additions): smoke tests only (render + click).

Run with (✦ from the `client/` directory; requires adding
`@vitest/coverage-v8`):

```bash
cd client && npm run test -- --coverage
```

The CI step (if present) should fail on coverage drops in
`client/src/components/GameContext/GameContext.tsx`.

---

## 6. Acceptance criteria

1. **AC1** — All tests listed in `11-tests-overview.md` exist as
   passing or `it.todo(...)` entries after each task is implemented.
2. **AC2** — A new agent can run `npm run test` from the **`client/`
   directory** (✦ no root `package.json`) and see only green /
   `[todo]` markers — no red.
3. **AC3** — A future regression (e.g. breaking the freighter
   recall) trips at least one specific test in this suite.
4. **AC4** — `client/src/components/GameContext/__tests__/_helpers.ts`
   exists and is used by every Rise of Ix reducer-slice test in this
   plan.

---

## 7. Notes

- We deliberately recommend **`it.todo`** stubs first for any card
  whose printed text is paraphrased in the user's cursor note. That
  way the test plan is committed, but `npm run test` does not fail
  during incremental implementation.
- Component / UI tests are kept lean because the app currently has
  none — the `vitest` config is set up for it but `@testing-library`
  is not yet a dependency. Adding it is part of the first
  component-test PR.
