# Rise of Ix rules and unit-test tasks

This checklist turns the implementation plan in `plans/rise-of-ix/01-*.md`
through `10-*.md` into regression tasks. Test files named below are proposed
unless they already exist; keep using the current Vitest setup and helpers from
`client/src/components/GameContext/__tests__/_helpers.ts`.

## Current state checkpoint

- `client/package.json` exposes `npm run test`, `npm run build`, and
  `npm run lint`.
- Vitest runs in the `node` environment and excludes
  `client/src/__tests__/deferred/**`.
- Rise of Ix UI/setup is still planned, not fully exposed in the app. Until the
  feature flag exists in setup, UI regression must record that Rise of Ix
  expansion selection is blocked.

## Unit-test matrix

| Area | Rule/functionality to confirm | Test task |
|------|-------------------------------|-----------|
| Expansion flag | New games can enable/disable Rise of Ix; legacy saves without the flag behave as base game; history and undo preserve the flag. | Add `expansionsFlag.test.ts`; assert default false, seeded true, undo snapshots, save export/import shape. |
| Deck construction | Rise of Ix adds the expansion Imperium cards only when enabled and keeps base deck unchanged when disabled. | Add `riseOfIxDeck.test.ts`; assert card count, duplicate quantities, unique ids, image paths, and base-only count when disabled. |
| Conflict deck | Rise of Ix conflict setup uses 10 cards with tier mix 1/5/4; base game keeps its existing tier mix. | Add `conflictsRiseOfIx.test.ts`; assert tier counts and no cross-mode mutation. |
| Leaders | The six Rise of Ix leaders are selectable only with the flag; base Baron remains available once, not duplicated. | Add `riseOfIxLeaders.test.ts`; assert names, complexity, image paths, signet hooks, and setup choices. |
| Board overlay | CHOAM overlay and Ix board panel render only with the flag; replaced spaces are unavailable. | Enable or add UI/component smoke tests when jsdom deps land; until then, assert hotspot data with a node-safe test. |
| Dreadnoughts | Each player has two dreadnoughts; commission, deploy, retreat, conflict strength, control-space placement, and replacement rules are tracked. | Add `dreadnoughts.test.ts` plus utility tests for unit counting and combat strength. |
| Units | Cards/intrigues that say "unit" apply to troops and dreadnoughts where rules allow. | Add targeted reducer cases in `dreadnoughts.test.ts` and card/intrigue tests. |
| Freighter track | Advance 0-3, recall from shipping track, dividends, troop/influence reward, and spice/acquire-tech reward are tracked and undoable. | Add `freighter.test.ts`; include each reward branch and snapshot history assertions. |
| Tech tiles | Three stacks, face-up tile acquisition, spice discounts from negotiators, acquire rewards, round-start flips, reveal effects, once-per-round limits, after-conflict effects, and endgame scoring are tracked. | Add `techTiles.test.ts`; split data integrity, acquire flow, per-tile timing, and endgame scoring into separate `describe` blocks. |
| Negotiators | Troops can be placed as negotiators on Ix, reduce one tech purchase by one spice each, then clear correctly. | Cover in `techTiles.test.ts`; assert troop source/destination and discount cap. |
| Snooper tokens | Tessia Vernius setup and signet can place/use snoopers without changing unrelated faction influence. | Add `tessia.test.ts`; assert setup state, signet prompt, and undo. |
| Infiltration | Cards with infiltration can place an Agent on an occupied enemy space while ordinary cards cannot. | Add Rise of Ix cases to `endTurnGating.test.ts` or `riseOfIxCards.test.ts`. |
| Unload | Unload reveal effects trigger on reveal, discard, or trash according to the printed card text. | Add `unload.test.ts`; include CHOAM Delegate, Freighter Fleet, Water Peddler, and any card with a manual prompt. |
| Imperium row cards | Every Rise of Ix Imperium row card has data and reducer/UI behavior matching the chosen automation level. | Add `riseOfIxCards.test.ts`; one passing test or `it.todo` per card from `08-imperium-row-cards.md`. |
| Intrigue cards | Plot/combat/endgame timing, resource costs, combat strength, dreadnought retreat, and alternate-mode cards are handled. | Add `riseOfIxIntrigue.test.ts`; one passing test or `it.todo` per card from `09-intrigue-cards.md`. |
| Combat | Dreadnought strength, retreat/removal, control bonuses, tie rewards, and post-conflict return/control behavior remain correct. | Extend `conflictsBase.test.ts` or add `combatRiseOfIx.test.ts`; include first/second/tie and no-strength cases. |
| Endgame | Rise of Ix endgame scoring from tech and intrigue cards combines with base tiebreakers. | Extend `endgameResolution.test.ts`; include Chaumurky, Holtzman Engine, Memocorders, Spy Satellites, Machine Culture, War Chest, and Grand Conspiracy. |
| Save/history | New Rise of Ix state survives turn history navigation, undo, save document export, and runtime state export. | Add `riseOfIxSaveRoundTrip.test.ts`; assert dreadnoughts, freighter, tech, negotiators, snoopers, and expansion flags. |

## Minimum per-task acceptance

Each implementation task is complete only when:

1. Base tests still pass with Rise of Ix disabled.
2. New Rise of Ix tests pass or are represented by explicit `it.todo(...)`
   entries with card/rule names.
3. Undo/time-travel is tested for every reducer action that changes Rise of Ix
   state.
4. Manual-only effects are surfaced as prompts or hints and covered by a test
   that verifies the prompt metadata.
5. Data tests verify public asset paths only; no secrets or environment-specific
   values are introduced.
