# Choice resolution, gains & game logging

My Mentat records **events** and rebuilds **turn history** from them (`save/buildHistory.ts`, `save/recording.ts`). Rise of Ix adds freighter, tech, dreadnought, and acquire-tech choice types.

## Choice types (RoI-relevant)

| Type | Examples | Resolution action |
|------|----------|-------------------|
| `FIXED_OPTIONS` | Freighter Advance/Recall, Detonation Devices, Machine Culture confirm | `RESOLVE_CHOICE` + `optionIndex` |
| Influence choose-one | Blackmail, Finesse, shipping step 2 | `RESOLVE_CHOICE` + `reward` or option |
| Acquire tech | Conflict Economy Supremacy, shipping step 3, Dreadnought space | `ACQUIRE_TECH` after choice |
| Commission OR deploy | Dreadnought at combat space | `RESOLVE_CHOICE` |
| Control space | Win with dreadnought | `RESOLVE_CHOICE` picking space |

## Automated recording checks

| ID | Assertion | File |
|----|-----------|------|
| LG-01 | Freighter `RESOLVE_CHOICE` serializes for event log | `freighter.test.ts` |
| LG-02 | `shouldRecordEvent` rejects no-op `END_TURN` | `save/__tests__/recording.test.ts` |
| LG-03 | `DEPLOY_TROOP` consecutive events allowed | `recording.test.ts` |
| LG-04 | `expansions` preserved in history snapshots | `expansionsFlag.test.ts` |
| LG-05 | Save round-trip base fixture | `save/__tests__/saveRoundTrip.test.ts` |

## Turn history expectations

After each completed turn, history row should include:

| Field | Expected |
|-------|----------|
| `currTurn.type` | `ACTION` (agent) or `REVEAL` |
| `currTurn.agentSpaceId` | Board space id → display name (e.g. "Smuggling") |
| `currTurn.gains[]` | Resources with `playerId`, `type`, `amount`, `source` |
| `currTurn.gains[].source.type` | `BOARD_SPACE`, `SHIPPING_TRACK`, `IX_BOARD`, `INTRIGUE`, etc. |
| `players[*].freighterStep` | Updated after freighter resolve |
| `players[*].tech` | Updated after acquire |
| `ixBoard.stacks` | Updated after acquire |

Display helpers: `utils/turnGainsDisplay.ts`, `utils/turnHistoryDisplay.ts` — **extend for RoI sources** (todo).

## `pendingChoices` / `pendingRewards` flow

1. Action applies reward → enqueues choice (freighter, influence, etc.).
2. User resolves via turn controls (or modal).
3. `RESOLVE_CHOICE` clears choice, applies rewards, may enqueue follow-ups.
4. `END_TURN` only when gating allows (`endTurnGating.test.ts`).

RoI-specific: multiple freighter choices resolve **one at a time** (`freighter.test.ts` FR-08).

## Undo

| ID | Check |
|----|-------|
| LG-10 | `UNDO_TO_TURN` restores `freighterStep` |
| LG-11 | `UNDO_TO_TURN` restores `expansions` |
| LG-12 | Undo after acquire tech restores spice + stack + `player.tech` (todo) |
| LG-13 | Undo after dreadnought control choice (todo) |

Base: `undoTurnGains.test.ts` — ensure RoI gains included when extending.

## Todo

| ID | Item |
|----|------|
| LG-20 | `saveRoundTrip.test.ts` with full RoI fixture (freighter + tech + dreadnought) |
| LG-21 | `buildHistory.test.ts` scenarios for `ACQUIRE_TECH` events |
| LG-22 | `turnGainsDisplay` unit tests for `SHIPPING_TRACK`, `IX_BOARD` labels |
| LG-23 | `decisionEvents.test.ts` coverage for RoI custom effects |

## Verification procedure (agent)

1. Play a turn that creates a pending choice (e.g. Smuggling → freighter).
2. Open **Turn History** — prior turn shows solari gain from space.
3. Resolve choice — current turn gains show freighter advance or recall rewards.
4. **Undo** one step — freighter step and gains revert.
5. If save export available, confirm `events[]` contains `RESOLVE_CHOICE` with `optionIndex`.

Hosted details: [10-ui-regression.md](./10-ui-regression.md) **UI-LOG-*** series.
