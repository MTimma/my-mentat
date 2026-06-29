# Freighter & shipping track

Rise of Ix adds one freighter disc per player on the CHOAM shipping track. Freighter icons create an Advance/Recall choice; Recall returns the disc to 0 and pays all rewards at or below the current step.

## Automated

| ID | Assertion | File |
|----|-----------|------|
| FR-01 | Smuggling creates a freighter choice and Advance moves 0 -> 1 | `freighter.test.ts` |
| FR-02 | Advance caps at step 3 | `freighter.test.ts` |
| FR-03 | Recall from 0 consumes the action, logs a zero-value recall, and leaves no pending work | `freighter.test.ts` |
| FR-04 | Recall from 1 enqueues only the step-1 Dividends OR +2 spice choice | `freighter.test.ts` |
| FR-05 | Recall from 2 enqueues step-1 choice plus troops and influence choice | `freighter.test.ts` |
| FR-06 | Recall from 3 enqueues steps 1, 2, and acquire-tech step 3 | `freighter.test.ts` |
| FR-07 | Dividends pays +5 solari to active player and +1 to each opponent | `freighter.test.ts` |
| FR-08 | Interstellar Shipping emits two sequential freighter choices | `freighter.test.ts` |
| FR-09 | `freighterStep` persists across `END_TURN` | `freighter.test.ts` |
| FR-10 | `UNDO_TO_TURN` restores the prior `freighterStep` | `freighter.test.ts` |
| FR-11 | Freighter `RESOLVE_CHOICE` payloads are JSON-serializable | `freighter.test.ts` |
| FR-12 | Freighter rewards are ignored when `riseOfIx` is off | `freighter.test.ts` |

## Board-space integration

| ID | Rule | Automated check |
|----|------|-----------------|
| FR-BS-01 | **Smuggling** (space 25) requires a Spice Trade icon and gives +1 solari + 1 freighter | `freighter.test.ts`, `boardSpaces.test.ts` |
| FR-BS-02 | **Interstellar Shipping** (space 26) requires Spice Trade and Spacing Guild influence >= 2 | `freighter.test.ts`, `boardSpaceAvailability.test.ts` |
| FR-BS-03 | Base spaces covered by the CHOAM overlay are not selectable when RoI is enabled | `boardSpaceAvailability.test.ts` |

## Recall reward checklist

| Step | Expected reward | Coverage |
|------|-----------------|----------|
| 1 | Dividends (+5 active / +1 each opponent) OR +2 spice | `freighter.test.ts` |
| 2 | +2 troops and +1 influence choice | `freighter.test.ts` |
| 3 | Acquire Tech with a 2-spice discount | `freighter.test.ts`, `techTiles.test.ts` |

## Sources of freighter icons

| Source | Icons | Test path |
|--------|-------|-----------|
| Smuggling (space 25) | 1 | UI + agent turn |
| Interstellar Shipping (26) | 2 | UI + influence gate |
| Skirmish IV / V conflicts | 1 | `conflictRewards.test.ts` |
| Trade Monopoly | 2 | `conflictRewards.test.ts` |
| Plot intrigues Diversion, Expedite | 1 each | `riseOfIxIntrigue.test.ts` |
| Imperium cards with freighter reward | varies | todo per card |

## Troop Transports interaction

When player owns **Troop Transports** tech, shipping step-2 troop reward becomes **3 troops** with optional deploy (`techTiles.test.ts`).

## Gain logging

Freighter gains should use `GainSource.SHIPPING_TRACK` in `currTurn.gains` / event log.

Verify in [09-choice-resolution-logging](./09-choice-resolution-logging.md) and UI scenario **UI-SHIP-03**.

## UI scenarios

Hosted click paths:

- [10-ui-regression.md](./10-ui-regression.md) **UI-BOARD-01** — Smuggling -> Advance.
- [10-ui-regression.md](./10-ui-regression.md) **UI-BOARD-02** — Interstellar Shipping gate and two choices.
- [10-ui-regression.md](./10-ui-regression.md) **UI-SHIP-01** — Recall from step 2.
- [10-ui-regression.md](./10-ui-regression.md) **UI-SHIP-02** — Dividends vs spice branch.
- [10-ui-regression.md](./10-ui-regression.md) **UI-SHIP-03** — Turn-history labels.

## Todo / extensions

| ID | Item | Suggested test |
|----|------|----------------|
| FR-20 | Save round-trip with freighter step, recall choice, and shipping gains | `saveRoundTrip.test.ts` RoI fixture |
| FR-21 | Full UI regression automation once `e2e/` exists | map UI-SHIP scenarios to Playwright |
| FR-22 | Freighter status modal shows step + reward summary | component or e2e test |
| FR-23 | Recall bundle order when multiple icons queued same turn | `freighter.test.ts` |
| FR-24 | Turn-history labels for Dividends vs spice branch | `turnGainsDisplay.test.ts` |
