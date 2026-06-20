# Follow-up 03 — Tech tile activation UI

> **Gate:** `state.expansions.riseOfIx === true` only.
> Depends on [Task 06](../06-tech-tiles.md).

---

## 1. Goal

Add **player-initiated activation** for owned tech tiles whose timing
includes an Agent / Reveal window **once per round** (or similar). Passive
timings (Round Start, After Conflict, Endgame) are already partially wired
in `riseOfIxReducer.ts`; this task covers tiles the player must **choose
to use** during their turn.

Priority tiles called out in the main implementation summary:

- **Flagship** — Agent/Reveal once per round: pay 4 solari → +3 troops
- **Holoprojectors** — Agent/Reveal once per round: discard 1 → draw 1
- **Sonic Snoopers** — Agent/Reveal one-time: trash tile → intrigue deck
  manipulation

Extend the same pattern to other `TechTileTiming` values that need a
button (Training Drones, Invasion Ships agent window, etc.) as time allows.

---

## 2. Current state

- **Data:** `client/src/data/techTiles.ts` — timings + `customEffect` on
  all 18 tiles.
- **Reducer:** `ACQUIRE_TECH`, round-start flips, passive reveal/combat/endgame
  hooks exist. **No** `ACTIVATE_TECH` action or TurnControls buttons.
- **UI:** `TechStacksModal` handles acquisition only.

---

## 3. Requirements

1. **R1 — Action.** `{ type: 'ACTIVATE_TECH', playerId, tileId }` in
   `GameAction`; handler in `riseOfIxReducer.ts`. No-op when `!riseOfIx`.
2. **R2 — Eligibility.** `tilesActivatableNow(state, playerId)` pure helper:
   - Player owns tile (`player.tech`)
   - Tile `faceUp === true`
   - Timing matches current phase/turn (Agent turn vs Reveal turn)
   - Not already used this round (track per-tile on `Player` or
     `currTurn` — e.g. `activatedTechThisRound: TechTileId[]`)
3. **R3 — Per-tile effects.** Reuse `customEffect` dispatch table:
   - Flagship: cost 4 solari → +3 troops
   - Holoprojectors: discard choice → draw 1
   - Sonic Snoopers: trash tile + intrigue bottom/deck UI (may stay
     **manual** with hint if full automation is too heavy)
   - Training Drones: +1 troop
   - Invasion Ships: discard → `infiltrateIgnoreOccupancyOnce` (extend
     existing `GameState` flag)
4. **R4 — UI.** `TurnControls` (or combat-area strip when appropriate):
   render one button per activatable tile for the active player only.
   Hide entire block when `!riseOfIx`.
5. **R5 — Face-down.** After activation, flip tile face-down until next
   Round Start (existing round-start flip logic).
6. **R6 — History.** Add `ACTIVATE_TECH` to `client/src/save/recording.ts`.
7. **R7 — Sandbox.** After setup commit, activation buttons work; optional:
   show owned tiles in `SandboxPlayerEditor` (read-only list).

---

## 4. Files touched (expected)

| File | Change |
|------|--------|
| `client/src/types/GameTypes.ts` | `ACTIVATE_TECH` action; optional tracking fields |
| `client/src/components/GameContext/riseOfIxReducer.ts` | Activation handlers |
| `client/src/components/TurnControls/TurnControls.tsx` | Activation buttons |
| `client/src/utils/techTiles.ts` | `tilesActivatableNow` helper |
| `client/src/save/recording.ts` | Record `ACTIVATE_TECH` |
| `client/src/components/PlayerOverviewModal/` | Optional owned-tile list |

---

## 5. Acceptance criteria

1. **AC1** — RoI off: no activation buttons anywhere.
2. **AC2** — RoI on, Flagship owned face-up on Agent turn: button visible;
   click pays 4 solari, +3 troops, tile flips face-down.
3. **AC3** — Same tile face-down: button hidden until Round Start.
4. **AC4** — Holoprojectors: discard prompt then draw 1.
5. **AC5** — `UNDO_TO_TURN` restores activation count and tile face state.

---

## 6. Unit tests

**Path:** `client/src/components/GameContext/__tests__/techActivation.test.ts`

- [ ] `ACTIVATE_TECH no-op when riseOfIx false`
- [ ] `Flagship activation costs 4 solari grants 3 troops`
- [ ] `tile flips face-down after activation`
- [ ] `not activatable when wrong turn type`

---

## 7. Notes

- Design sketch in [Task 06 §5.4](../06-tech-tiles.md).
- Prefer modular handlers in `riseOfIxReducer.ts` over growing
  `GameContext.tsx` switch cases.
