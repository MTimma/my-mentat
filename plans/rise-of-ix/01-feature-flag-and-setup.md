# Task 01 — `riseOfIx` feature flag & setup wiring

> **Prerequisite for every other task in this folder.**
> Without this flag in place there is no way to render the expansion safely
> alongside the existing base game.

---

## 1. Goal

Add a top-level boolean toggle **`riseOfIx`** that:

- Is **off by default** (existing behaviour preserved).
- Is **chosen at setup time** by the user (in `GameSetup`), persisted to
  `localStorage`, and read back on next page load.
- Is **threaded into `GameState`** so the reducer can branch on it.
- Drives **deck composition** (whether RoI Imperium cards, RoI intrigue
  cards and RoI conflict cards are mixed in).
- Drives **board rendering** (CHOAM overlay + Ix board panel).
- Drives **leader pool** (whether RoI leaders are selectable).
- Survives **time travel / undo** unchanged (it is configuration, not state
  that mutates inside a turn).

> An optional `riseOfIxEpic` sub-flag is reserved in types but **not
> implemented** in this pass.

---

## 2. Requirements

1. **R1 — Setup UI.** `GameSetup.tsx` shows a `Rise of Ix` checkbox (or
   toggle) under the existing controls. Toggling it does not affect the
   existing setup fields.
2. **R2 — Persistence.** The chosen value is persisted in
   `localStorage` under key `myMentat.riseOfIx` (same pattern as
   `myMentat.autoApplyMandatoryRewards`).
3. **R3 — Propagation to GameState.** The boolean is added to
   `GameState` (e.g. `expansions: { riseOfIx: boolean; riseOfIxEpic: boolean }`)
   and seeded by the `GameProvider`’s `initialState` prop.
4. **R4 — Leader pool.** When `riseOfIx === true`, the 6 new leaders
   from [`07-leaders.md`](./07-leaders.md) are appended to the existing
   `LEADERS` array seen in the leader dropdown. Base Baron stays as-is
   (the RoI rule sheet reprints him but the ability is identical).
5. **R5 — Imperium Row deck.** When `riseOfIx === true`,
   `buildImperiumDeck()` mixes the 29 RoI Imperium cards (see
   [`08-imperium-row-cards.md`](./08-imperium-row-cards.md)) into the
   base deck before shuffling.
6. **R6 — Intrigue deck.** When `riseOfIx === true`, the 17 RoI
   intrigue cards (see [`09-intrigue-cards.md`](./09-intrigue-cards.md))
   are appended to `intrigueCards` for both
   `IntrigueDeckService` and `getFreshDefaultGameState`’s `intrigueDeck`.
7. **R7 — Conflict deck.** When `riseOfIx === true`, the 4 RoI
   conflict cards are appended to `CONFLICTS` and the per-round tier
   filter reflects the new pool.
   > ✦ 2026-06-10: the tier filter lives in **`App.tsx`** (~line 1129:
   > round 1 → tier I, rounds 2–6 → tier II, 7+ → tier III), **not** in
   > `ConflictSelect.tsx` — that component is now a portal-aware dumb
   > renderer of the `conflicts` prop. Swap the pool source in `App.tsx`
   > (`CONFLICTS` → `getConflictPool(expansions)`). Note also that the
   > base tier mix is **4 / 10 / 4** (not 4 / 8 / 4).
   See [`10-conflict-cards.md`](./10-conflict-cards.md).
8. **R8 — Board image / overlay.** `ImageBoard` shows
   `/board/riseofix/riseofix1.png`
   and `/board/riseofix/riseofix2.png` 
   Negotiation strip **only when the flag is true** — see
   [`03-board-overlay-ix-board.md`](./03-board-overlay-ix-board.md).
9. **R9 — Default-off invariants.** With `riseOfIx === false`:
   - No RoI cards appear in any deck.
   - No RoI hotspots or overlays render.
   - No RoI leaders appear in the picker.
   - `Player.dreadnoughts`, `Player.freighterStep`, `Player.tech`,
     `Player.negotiatorsOnIx`, `Player.snoopers` and
     `GameState.ixBoard` default to empty/zero — every base test must
     still pass.
10. **R10 — Time travel parity.** The flag is part of the state
    snapshots stored in `state.history`. Undoing a turn never flips the
    flag (it is invariant for the lifetime of a game).
11. **R11 — Backwards compatibility for saved games.** If a saved game
    is loaded that does not carry `expansions`, treat it as
    `{ riseOfIx: false, riseOfIxEpic: false }` (no migration noise).

---

## 3. Files touched

| File | Change |
|---|---|
| `client/src/types/GameTypes.ts` | Add `Expansions` interface; add `expansions: Expansions` to `GameState`. Optional sub-fields per [`02-types-and-data-models.md`](./02-types-and-data-models.md). |
| `client/src/components/GameSetup.tsx` | Add Rise of Ix toggle. Pass `expansions` to `onComplete` payload. |
| `client/src/App.tsx` | Read/write `localStorage` for `myMentat.riseOfIx`; pass `expansions` through `playerSetups` and into `GameProvider initialState`. |
| `client/src/components/GameContext/GameContext.tsx` | Seed `expansions` in `initialGameState` (default both false); merge from `initialState` like the other already-merged fields. |
| `client/src/components/GameStateSetup/GameStateSetup.tsx` | Forward the toggle so its deck-building helpers can mix in RoI cards (see R5/R6/R7). |
| `client/src/data/cards.ts` | New exports `RISE_OF_IX_IMPERIUM_DECK`, `buildImperiumDeck({ expansions })` (optional arg). |
| `client/src/services/IntrigueDeckService.ts` | `intrigueCards` stays base-only. Add `ALL_INTRIGUE_CARDS({ expansions })` helper that returns base ⨁ RoI. Reducer + service consumer reads this helper. |
| `client/src/data/conflicts.ts` | New `RISE_OF_IX_CONFLICTS` array. `getConflictPool(expansions)` helper. |
| `client/src/data/leaders.ts` | New `RISE_OF_IX_LEADERS` array. `getLeaderPool(expansions)` helper. |
| `client/src/services/starterDeckSetup.ts` | `buildSetupImperiumDeck(playerDecks, expansions)` (signature extension). |

> Where existing functions are called without args, keep them
> default-friendly: e.g. `buildImperiumDeck(startId = 2000, expansions = NO_EXPANSIONS)`.

---

## 4. Detailed design

### 4.1 `Expansions` type

```ts
// in GameTypes.ts
export interface Expansions {
  riseOfIx: boolean
  /** Reserved — not implemented in this iteration. */
  riseOfIxEpic: boolean
}

export const NO_EXPANSIONS: Expansions = {
  riseOfIx: false,
  riseOfIxEpic: false,
}
```

`GameState` gains a single field:

```ts
expansions: Expansions
```

> ⚠ Add to the very end of the interface and seed in
> `initialGameState`, so the snapshot/`history` shape stays
> backwards-compatible when loading older state JSON.

### 4.2 Setup UI (GameSetup.tsx)

> ✦ 2026-06-10: `GameSetup.tsx` was restructured. There is no
> `setup-section` class; the layout is `setup-meta-row` (Game Name +
> Players selects) followed by `players-setup` (per-player rows).
> Place the toggle as a third `setup-field` inside `setup-meta-row`
> (or a slim row right below it):

  ```tsx
  <label className="setup-field setup-field--compact riseofix-toggle">
    <span className="setup-field-label">Rise of Ix</span>
    <input
      type="checkbox"
      checked={expansions.riseOfIx}
      onChange={(e) => setExpansions(prev => ({ ...prev, riseOfIx: e.target.checked }))}
    />
  </label>
  ```

- Pass `expansions` to `onComplete` (current signature is
  `onComplete(playerSetups: PlayerSetup[])` — extend it, or add a
  parallel callback). `App.tsx` then forwards it.
- Note: `getAvailableLeaders` in `GameSetup.tsx` filters the static
  `LEADERS` import — this is the call site to switch to
  `getLeaderPool(expansions)` (R4).

### 4.3 Persistence (App.tsx)

Pattern already exists for `autoApplyMandatoryRewards`. Mirror it:

```ts
const [expansions, setExpansions] = useState<Expansions>(() => {
  const raw = localStorage.getItem('myMentat.riseOfIx')
  return { ...NO_EXPANSIONS, riseOfIx: raw === 'true' }
})

useEffect(() => {
  localStorage.setItem('myMentat.riseOfIx', expansions.riseOfIx ? 'true' : 'false')
}, [expansions.riseOfIx])
```

Then pass `expansions={expansions}` to `<GameSetup />`,
`<GameStateSetup />` and `<GameProvider initialState={{ ..., expansions }}>`.

### 4.4 Deck builders

- `buildImperiumDeck(startId = 2000, expansions = NO_EXPANSIONS): Card[]`
  - When `expansions.riseOfIx`, concat `RISE_OF_IX_IMPERIUM_DECK` before
    re-id-ing.
- `buildIntrigueDeck(expansions = NO_EXPANSIONS): IntrigueCard[]`
  - When `expansions.riseOfIx`, concat `RISE_OF_IX_INTRIGUE_CARDS`.
- `getConflictPool(expansions): ConflictCard[]`
  - Base + (RoI when on). The `ConflictSelect` UI already filters by
    `tier`, but the **per-round tier mix** changes — see
    [`10-conflict-cards.md`](./10-conflict-cards.md) §4.
- `getLeaderPool(expansions): Leader[]`
  - Base + (RoI when on).

These helpers live alongside the existing arrays and are imported by
`GameContext.tsx`, `GameSetup.tsx`, `GameStateSetup.tsx`,
`ImperiumRowSelect.tsx`.

### 4.5 GameContext seeding

In `getFreshDefaultGameState()` add:

```ts
expansions: NO_EXPANSIONS,
```

`GameProvider` already merges `initialState`; verify the merge does not
drop `expansions` (it shouldn’t, but lock it in).

> Important: anywhere the reducer currently writes a fresh sub-state
> (e.g. after `RESOLVE_COMBAT`), it must **preserve `expansions`** — it
> is configuration, not turn state.

### 4.6 Time-travel / snapshot

- `history: GameState[]` already deep-copies state shape. Confirm via
  the existing `__tests__` that `expansions` is present on every
  snapshot.
- `UNDO_TO_TURN` should restore the snapshot’s `expansions` (the same
  value, by R10).

---

## 5. Acceptance criteria

1. **AC1** — Loading the app with no prior `localStorage` value shows
   the Rise of Ix toggle in the OFF state and starts the game with
   `state.expansions.riseOfIx === false`.
2. **AC2** — Toggling the checkbox ON, reloading the browser, and
   re-entering setup keeps it ON.
3. **AC3** — Starting a game with the toggle OFF produces:
   - An Imperium Row deck whose card names are a strict subset of the
     base **67-card** pool (✦ corrected — see `baseGameManifest.test.ts`;
     the original plan said 64).
   - An Intrigue deck of exactly 32 cards.
   - A Conflict deck whose card names are a strict subset of the base 18.
   - A leaders dropdown showing exactly the 8 base leaders.
   - No riseofix1/2/3/4 overlays in the rendered `ImageBoard`.
4. **AC4** — Starting a game with the toggle ON produces:
   - An Imperium Row deck whose pool **includes** all 29 RoI cards.
   - An Intrigue deck of exactly 49 cards (32 base + 17 RoI).
   - A Conflict deck of exactly 22 cards (18 + 4) before the
     per-tier draw, and the per-round tier mix matches
     [`10-conflict-cards.md`](./10-conflict-cards.md).
   - A leaders dropdown showing 14 leaders (8 base + 6 RoI).
   - `riseofix2.png` over Sell Melange + Secure Contract and
     `riseofix1.png` over the middle-top-left Landsraad strip.
5. **AC5** — All existing tests in `client/src/components/GameContext/__tests__`
   and `client/src/services/__tests__` still pass with no modification.
6. **AC6** — Time travel: from a Rise of Ix game, `UNDO_TO_TURN`
   yields a snapshot whose `expansions.riseOfIx === true` and whose
   board still renders the overlays.

---

## 6. Unit tests

**Path:** `client/src/components/GameContext/__tests__/expansionsFlag.test.ts` (new)

- [ ] `expansions defaults to NO_EXPANSIONS when initialState omits it`
- [ ] `expansions seeded from initialState.expansions.riseOfIx === true is preserved through END_TURN / PLAY_CARD / RESOLVE_COMBAT`
- [ ] `UNDO_TO_TURN preserves expansions`
- [ ] `expansions does not appear in the diff between two consecutive history snapshots when no action was supposed to change it`

**Path:** `client/src/data/__tests__/buildImperiumDeck.test.ts` (new)

- [ ] `buildImperiumDeck(2000, { riseOfIx: false }) length matches today's value`
- [ ] `buildImperiumDeck(2000, { riseOfIx: true }) length === base length + 29`
- [ ] `buildImperiumDeck(2000, { riseOfIx: true }) contains an "Appropriate" card`
- [ ] `ids are unique across the returned deck`

**Path:** `client/src/data/__tests__/conflictPool.test.ts` (new)

- [ ] `getConflictPool({ riseOfIx: false }).length === 18`
- [ ] `getConflictPool({ riseOfIx: true }).length === 22`
- [ ] `tier counts match the data (base 4 / 10 / 4 + RoI additions — see 10-conflict-cards.md §4 for the resolved RoI tier split)`

**Path:** `client/src/data/__tests__/leaderPool.test.ts` (new)

- [ ] `getLeaderPool({ riseOfIx: false }).length === 8`
- [ ] `getLeaderPool({ riseOfIx: true }).length === 14`

> The above are **specifications, not implementations** — leave the
> `it.todo(...)` form in code if the corresponding data isn’t in place
> yet.

---

## 7. Notes / open questions

- **Where to render the toggle?** Two options: in `GameSetup` only, or
  also in `GameStateSetup` (the second screen). Recommendation: render
  it on `GameSetup` only — flag must be locked once the deck is dealt.
- **Mid-game flip.** Explicitly **not supported**. The flag is locked
  after `ScreenState.SETUP` advances. UI does not show a toggle inside
  `ScreenState.GAME`.
- **Saved games.** The current app does not yet have an "export /
  import save" feature, but the snapshot shape used by `history` is
  effectively the save format. The `expansions` field becoming part of
  `GameState` ensures forward compatibility once such a feature exists.
