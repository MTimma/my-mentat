# Rise of Ix verification (Dune: Imperium expansion)

Agent-oriented test plan and automated checks for **Rise of Ix** on top of the base game. Base-game regression lives in [`plans/base-game/regression-test/`](../../base-game/regression-test/).

## Sources

| Source | URL |
|--------|-----|
| RoI rulebook (PDF) | [DUNE_IMPERIUM_RISE_OF_IX_Rulebook_22-2-11.pdf](https://d19y2ttatozxjp.cloudfront.net/pdfs/DUNE_IMPERIUM_RISE_OF_IX_Rulebook_22-2-11.pdf) |
| Base rules | [plans/base-game/regression-test](../../base-game/regression-test/) |
| Implementation plans | [`plans/rise-of-ix/`](../) |
| Cursor rules | `.cursor/rules/round-structure.mdc`, `.cursor/rise_of_ix` |
| Assets | `client/public/board/riseofix/`, `technologies/rise_of_ix/`, `intrigue/rise_of_ix/`, `imperium_row/rise_of_ix/`, `conflicts/cards/rise_of_ix/` |

## Quick verify (CI / cloud agent)

From repo root:

```bash
cd client && npm run test
```

Filter to Rise of Ix–related suites:

```bash
cd client && npm run test -- \
  expansionsFlag conflictPool intrigueDeck buildImperiumDeck \
  freighter dreadnoughts techTiles techActivation conflictRewards \
  riseOfIxIntrigue unload cardsRiseOfIx boardSpaceAvailability \
  boardHotspots combatStrength dreadnoughts tessiaSnoopers
```

Expected: all matching `it(...)` **green**; `it.todo` entries are intentional backlog.

Regenerate catalogs after data changes:

```bash
cd client && npx tsx scripts/generate-catalogs.ts
```

## Document map

| File | Purpose |
|------|---------|
| [00-verification-test-plan.md](./00-verification-test-plan.md) | Master checklist: rules, cards, logging, UI |
| [01-setup-and-flag.md](./01-setup-and-flag.md) | `riseOfIx` toggle, pools, initial state |
| [02-board-spaces-and-overlay.md](./02-board-spaces-and-overlay.md) | CHOAM overlay, Ix panel, 4 new spaces |
| [03-intrigue-cards.md](./03-intrigue-cards.md) | 17 RoI intrigue cards |
| [04-conflicts-and-combat.md](./04-conflicts-and-combat.md) | 4 RoI conflicts, dreadnought combat, rewards |
| [05-freighter-shipping.md](./05-freighter-shipping.md) | Shipping track advance/recall/dividends |
| [06-tech-tiles.md](./06-tech-tiles.md) | Acquire, flip, activation, ongoing effects |
| [07-dreadnoughts-and-units.md](./07-dreadnoughts-and-units.md) | Commission, deploy, strength, control cover |
| [08-imperium-cards-unload.md](./08-imperium-cards-unload.md) | 29 unique RoI imperium cards, Unload |
| [09-choice-resolution-logging.md](./09-choice-resolution-logging.md) | `RESOLVE_CHOICE`, gains, save/recording |
| [10-ui-regression.md](./10-ui-regression.md) | Hosted-app click scenarios for cloud agents |

## Code locations

| Area | Tests |
|------|-------|
| Expansion flag | `client/src/components/GameContext/__tests__/expansionsFlag.test.ts` |
| Deck / pool data | `client/src/data/__tests__/buildImperiumDeck.test.ts`, `conflictPool.test.ts`, `intrigueDeck.test.ts`, `leaderPool.test.ts` |
| Board data | `client/src/data/__tests__/boardHotspots.test.ts`, `boardSpaceAvailability.test.ts` |
| Tech tile data | `client/src/data/__tests__/techTiles.test.ts` |
| Freighter | `client/src/components/GameContext/__tests__/freighter.test.ts` |
| Tech tiles (reducer) | `client/src/components/GameContext/__tests__/techTiles.test.ts`, `techActivation.test.ts` |
| Dreadnoughts | `client/src/components/GameContext/__tests__/dreadnoughts.test.ts`, `client/src/utils/__tests__/combatStrength.test.ts`, `dreadnoughts.test.ts` |
| Conflicts | `client/src/components/GameContext/__tests__/conflictRewards.test.ts` |
| Intrigue | `client/src/components/GameContext/__tests__/riseOfIxIntrigue.test.ts` |
| Imperium data / Unload | `client/src/components/GameContext/__tests__/cardsRiseOfIxData.test.ts`, `unload.test.ts` |
| Sandbox / Ix board seed | `client/src/components/GameContext/__tests__/sandboxSetup.test.ts` |
| Catalog v2 | `client/src/catalog/__tests__/buildCatalog.test.ts`, `catalog.test.ts` |
| Shared helpers | `client/src/components/GameContext/__tests__/_helpers.ts` |
| RoI reducer slice | `client/src/components/GameContext/riseOfIxReducer.ts`, `riseOfIx/*.ts` |

## Expansion policy

- Base-game tests in `plans/base-game/regression-test/` must stay green with `riseOfIx: false`.
- RoI tests must gate on `expansions.riseOfIx === true` (or use `getRoiTestState` pattern from `_helpers.ts`).
- Do not weaken base manifest tests when adding RoI catalog entries.

## Cloud agent hosted-app workflow

1. Open the deployed My Mentat URL (or `npm run dev` locally).
2. Enable **Rise of Ix** on the setup screen (`GameSetup` checkbox).
3. Prefer **Sandbox** mode for deterministic card/board seeding when available.
4. Run scenarios in [10-ui-regression.md](./10-ui-regression.md); after each scenario, verify **Turn History** gains and **undo** one step.
5. Export or inspect save JSON if the hosted build exposes it — event log must round-trip (`save/__tests__/saveRoundTrip.test.ts`).
