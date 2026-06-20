# Tech tiles (18)

Data: `client/src/data/techTiles.ts`. State: `GameState.ixBoard` (3 stacks), `Player.tech[]` with `{ id, faceUp }`.

## Data tests (`data/__tests__/techTiles.test.ts`)

| ID | Assertion |
|----|-----------|
| TT-D01 | Exactly 18 entries |
| TT-D02 | Every `TechTileId` enum value appears once |
| TT-D03 | Image paths under `/technologies/rise_of_ix/` |

## Acquisition (`GameContext/__tests__/techTiles.test.ts`)

| ID | Assertion |
|----|-----------|
| TT-01 | `ACQUIRE_TECH` — pay spice, tile in `player.tech`, pop stack |
| TT-02 | Discount 2 from Tech Negotiation / shipping step 3 |
| TT-03 | Return negotiators: spice −1 per negotiator, troops +1 each |
| TT-04 | Rejected when insufficient spice |
| TT-05 | Rejected when `negotiatorsReturned > negotiatorsOnIx` |
| TT-06 | `ACQUIRE_TECH` via `applyGameAction` (recorded path) |

## Round Start

| ID | Tile | Assertion |
|----|------|-----------|
| TT-10 | (all) | Used tiles flip face-up at round start |
| TT-11 | Holtzman Engine | Draw 1 card at round start |
| TT-12 | Shuttle Fleet | +2 solari at round start |
| TT-13 | — | `SELECT_CONFLICT` applies round-start tech flip |

## Reveal timing

| ID | Tile | Status |
|----|------|--------|
| TT-20 | Artillery | ✓ +1 sword per sword-producing revealed card |
| TT-21 | Minimic Film | todo — +1 persuasion |
| TT-22 | Restricted Ordinance | ✓ +4 combat if High Council |
| TT-23 | Disposal Facility | todo — trash if persuasion ≥ 6 |

## After conflict (win)

| ID | Tile | Status |
|----|------|--------|
| TT-30 | Windtraps | ✓ +1 water on win |
| TT-31 | Detonation Devices | ✓ OR: +1 VP & dread to supply vs control normally |

## Ongoing / activation (`techActivation.test.ts`)

| ID | Tile | Timing | Status |
|----|------|--------|--------|
| TT-40 | Spaceport | Always | ✓ `acquireToTopThisRound` |
| TT-41 | Troop Transports | Always | ✓ shipping step-2 troop bonus |
| TT-42 | Flagship | Once/round activate | ✓ −4 solari → 3 troops; flips face-down |
| TT-43 | Holoprojectors | Once/round | todo |
| TT-44 | Training Drones | Once/round | todo |
| TT-45 | Invasion Ships | Agent once/round | ✓ gated by turn type; `infiltrateIgnoreOccupancyOnce` |
| TT-46 | Sonic Snoopers | One-time trash | todo |
| TT-47 | Spy Satellites | One-time + endgame | todo |

## Endgame

| ID | Tile | Status |
|----|------|--------|
| TT-50 | Holtzman Engine | ✓ +1 VP if ≥2 SMF |
| TT-51 | Memocorders | todo — +1 VP if ≥3 on all tracks |
| TT-52 | Chaumurky | todo — tiebreaker |
| TT-53 | Spy Satellites | todo — VP per low-influence faction |

## Acquire effects (immediate on take)

| Tile | acquireEffect |
|------|---------------|
| Chaumurky | +2 intrigue |
| Disposal Facility | trash 1 |
| Flagship | +1 VP |
| Holtzman Engine | — |
| Invasion Ships | +4 troops |
| Memocorders | +1 all factions influence |
| Shuttle Fleet | +1 all factions influence |
| Sonic Snoopers | +1 intrigue |
| Spaceport | draw 2 |
| Windtraps | +1 water |

## Agent checklist

1. Add/adjust tile in `techTiles.ts`.
2. Hook timing in `riseOfIxReducer.ts` (`applyRoundStartTech`, `applyRevealTechEffects`, etc.).
3. Add `it` or `it.todo` in `techTiles.test.ts` / `techActivation.test.ts`.
4. UI: Tech Stacks modal Acquire → **UI-TECH-*** in [10](./10-ui-regression.md).

## Sandbox seeding

`sandboxSetup.test.ts` — `SANDBOX_SET_IX_BOARD_TOP` sets face-up tiles per stack when RoI on.
