# Freighter & shipping track

Per-player `freighterStep: 0 | 1 | 2 | 3`. Freighter icons on cards/spaces/conflicts enqueue **Advance** vs **Recall** choices.

## Track rewards (on Recall from step N)

Collect rewards for steps **1…N**, then reset to 0.

| Step | Reward |
|------|--------|
| 1 | **Dividends** (+5 solari active, +1 each opponent) **OR** +2 spice |
| 2 | +2 troops **and** +1 influence (choose faction) |
| 3 | Acquire Tech with **−2 spice** discount |

Advance: `min(3, step + 1)`. At step 3, Advance is a no-op.

## Automated (`freighter.test.ts`)

| ID | Assertion |
|----|-----------|
| FR-01 | Advance 0 → 1 |
| FR-02 | Advance from 3 stays at 3 |
| FR-03 | Recall from 0 → no rewards |
| FR-04 | Recall from 1 → step-1 OR-choice only |
| FR-05 | Recall from 2 → dividends/spice + troops + influence |
| FR-06 | Recall from 3 → all three reward steps |
| FR-07 | Dividends pays +5 active, +1 each opponent |
| FR-08 | Two freighter icons → two pending choices |
| FR-09 | `freighterStep` persists `END_TURN` |
| FR-10 | `UNDO_TO_TURN` restores prior step |
| FR-11 | `RESOLVE_CHOICE` JSON-serializable (`assertJsonSerializable`) |
| FR-12 | No freighter choices when `riseOfIx` false |

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

## Todo

| ID | Item |
|----|------|
| FR-20 | Freighter status modal shows step + reward summary |
| FR-21 | Recall bundle order when multiple icons queued same turn |
| FR-22 | `turnGainsDisplay` labels for Dividends vs spice branch |

## UI scenarios

[10-ui-regression.md](./10-ui-regression.md) **UI-SHIP-*** series.
