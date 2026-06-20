# Setup & expansion flag

Rise of Ix is gated by `GameState.expansions.riseOfIx` (optional `riseOfIxEpic` — out of scope for first pass).

## Automated

| ID | Assertion | File |
|----|-----------|------|
| SF-01 | Default state `expansions === NO_EXPANSIONS` | `expansionsFlag.test.ts` |
| SF-02 | Setup with `riseOfIx: true` seeds flag on initial state | same |
| SF-03 | Flag preserved through `END_TURN`, `PLAY_CARD` | same |
| SF-04 | `UNDO_TO_TURN` restores prior `expansions` | same |
| SF-05 | History snapshots keep stable `expansions` when no flag action | same |
| SF-06 | `getConflictPool({ riseOfIx: true })` length 22 | `conflictPool.test.ts` |
| SF-07 | RoI conflict tier mix: 2× tier I (919–920), 1× III (921), 1× II (922) in pool | `conflictPool.test.ts` |
| SF-08 | `ALL_INTRIGUE_CARDS({ riseOfIx: true })` length 49 | `intrigueDeck.test.ts` |
| SF-09 | `RISE_OF_IX_INTRIGUE_CARDS` length 17 | `intrigueDeck.test.ts` |
| SF-10 | RoI imperium: 29 unique, 35 printings | `cardsRiseOfIxData.test.ts`, `buildImperiumDeck.test.ts` |
| SF-11 | `SANDBOX_SET_IX_BOARD_TOP` ignored when flag off | `sandboxSetup.test.ts` |
| SF-12 | Catalog v2 includes `expansions.v2.json` RoI entries | `buildCatalog.test.ts` |

## Per-player initial fields (when flag on)

| Field | Default | Seeded by |
|-------|---------|-----------|
| `freighterStep` | `0` | `GameStateSetup` / `makePlayer` |
| `dreadnoughts` | `{ supply: 2, garrison: 0, conflict: 0, control: [] }` | setup |
| `tech` | `[]` | — |
| `negotiatorsOnIx` | `0` | — |
| `snoopers` | `{}` | Tessia only |

| `ixBoard` | 3 stacks × 6 shuffled tiles, tops face-up | `buildInitialIxBoard()` |

## Todo

| ID | Rule | Suggested test |
|----|------|----------------|
| SF-20 | `riseOfIxEpic` changes conflict tier mix | `getConflictPool({ riseOfIxEpic: true })` |
| SF-21 | Leader pool includes 6 RoI leaders when flag on | extend `leaderPool.test.ts` |
| SF-22 | Save file `setup.expansions.riseOfIx` round-trips | `saveRoundTrip.test.ts` with RoI fixture |
| SF-23 | `getFreshDefaultGameState()` intrigue deck respects flag | integration test |

## UI setup (hosted)

See [10-ui-regression.md](./10-ui-regression.md) scenario **UI-SETUP-01**.
