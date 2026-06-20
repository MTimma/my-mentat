# Intrigue cards (Rise of Ix)

17 cards (ids 33–49) in `RISE_OF_IX_INTRIGUE_CARDS`; appended when `expansions.riseOfIx === true`.

## Implemented suite

`client/src/components/GameContext/__tests__/riseOfIxIntrigue.test.ts` — **17/17** cards covered.

## Test matrix

| ID | Name | Type | Automated test | Notes |
|----|------|------|----------------|-------|
| IX-IN-01 | Blackmail | Combat | ✓ | Influence cost choice → +5 combat |
| IX-IN-02 | Cannon Turrets | Combat | ✓ | +2 combat; opponents retreat 1 dreadnought |
| IX-IN-03 | Strategic Push | Combat | ✓ | +2 combat; +2 solari if win (`TO_THE_VICTOR`) |
| IX-IN-04 | Second Wave | Combat | ✓ | +2 combat; mobilize up to 2 garrison units |
| IX-IN-05 | War Chest | Combat/Endgame | ✓ | Combat: −2 solari → +4; Endgame: VP if solari ≥ 10 |
| IX-IN-06 | Finesse | Combat/Plot | ✓ | Combat +2; plot influence swap |
| IX-IN-07 | Advanced Weaponry | Combat/Plot | ✓ | +4 if 3 tech; plot commissions dreadnought |
| IX-IN-08 | Grand Conspiracy | Endgame | ✓ | Evaluator tiers (control, tech count, VP) |
| IX-IN-09 | Strongarm | Plot | ✓ | Troop cost → agent-faction influence |
| IX-IN-10 | Ixian Probe | Plot | ✓ | Discard 2 draw 2 |
| IX-IN-11 | Cull | Plot | ✓ | Solari cost → trash |
| IX-IN-12 | Secret Forces | Plot | ✓ | Requires High Council for +2 troops |
| IX-IN-13 | Quid Pro Quo | Plot | ✓ | Spice cost → influence per agent faction |
| IX-IN-14 | Glimpse the Path | Plot | ✓ | Spice, water, draw |
| IX-IN-15 | Diversion | Plot | ✓ | 4 units in conflict → freighter choice |
| IX-IN-16 | Expedite | Plot | ✓ | Spice → freighter choice |
| IX-IN-17 | Machine Culture | Plot/Endgame | ✓ | Plot pending acquire tech; endgame +1 VP if 3 tech |

## Choice patterns to regression-test

| Pattern | Cards | Resolution |
|---------|-------|------------|
| `FIXED_OPTIONS` freighter | Diversion, Expedite | `RESOLVE_CHOICE` with Advance/Recall |
| Influence choose-one cost/reward | Blackmail, Finesse | `reward` or `optionIndex` on `RESOLVE_CHOICE` |
| Win-conditional combat | Strategic Push | Applied after `RESOLVE_COMBAT` if player won |
| Phase-gated hybrid | War Chest, Machine Culture | `PLAY_INTRIGUE` only in matching `GamePhase` |
| Custom evaluators | Grand Conspiracy | `evaluateGrandConspiracy` unit-tested |

## Agent checklist for changes

1. Edit `client/src/data/intrigueCardsRiseOfIx.ts`.
2. Wire `CustomEffect` in `GameContext.tsx` or `riseOfIx/intrigue.ts`.
3. Update matching `it(...)` in `riseOfIxIntrigue.test.ts`.
4. Run hosted scenario **UI-INTRIGUE-*** if UI prompts change ([10](./10-ui-regression.md)).
5. Confirm intrigue count 49 in `intrigueDeck.test.ts`.

## Todo / extensions

| ID | Item |
|----|------|
| IX-IN-20 | Turn history labels for RoI intrigue plays |
| IX-IN-21 | Save/recording round-trip per intrigue with choices |
| IX-IN-22 | Combat intrigue pass-order with multiple players (UI) |
