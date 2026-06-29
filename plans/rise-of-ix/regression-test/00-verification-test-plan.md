# Rise of Ix verification — master test plan

For **Cursor cloud agents** and humans validating that Rise of Ix behavior, logging, and UI have not regressed.

## Run command

```bash
cd client && npm run test
```

- **Green `it(...)`** = must stay passing.
- **`it.todo(...)`** = specified behavior not yet automated; implement when touching that area.
- Base-game suites must still pass with default `NO_EXPANSIONS`.

## Coverage map

| Area | Automated | Plan doc | Primary test file(s) |
|------|-----------|----------|----------------------|
| Expansion flag & persistence | ✓ | [01-setup-and-flag](./01-setup-and-flag.md) | `expansionsFlag.test.ts` |
| Imperium deck (+35 cards) | ✓ data | 01, [08](./08-imperium-cards-unload.md) | `buildImperiumDeck.test.ts`, `cardsRiseOfIxData.test.ts` |
| Intrigue pool (+17 → 49) | ✓ data | [03](./03-intrigue-cards.md) | `intrigueDeck.test.ts`, `riseOfIxIntrigue.test.ts` |
| Conflict pool (+4 → 22) | ✓ data | [04](./04-conflicts-and-combat.md) | `conflictPool.test.ts`, `conflictRewards.test.ts` |
| Board spaces 23–26 + overlay | partial | [02](./02-board-spaces-and-overlay.md) | `boardSpaces.test.ts`, `boardHotspots.test.ts`, `boardSpaceAvailability.test.ts`, `boardSpaceTechNegotiation.test.ts` |
| Freighter / shipping | ✓ | [05](./05-freighter-shipping.md) | `freighter.test.ts` |
| Tech tiles (18) | ✓ reducer/data, partial UI | [06](./06-tech-tiles.md) | `techTiles.test.ts` (data + reducer), `techActivation.test.ts`, `utils/__tests__/techTiles.test.ts` |
| Dreadnoughts | ✓ | [07](./07-dreadnoughts-and-units.md) | `dreadnoughts.test.ts`, `combatStrength.test.ts` |
| Unload on discard/trash | ✓ | 08 | `unload.test.ts` |
| Choice resolution & recording | partial | [09](./09-choice-resolution-logging.md) | `freighter.test.ts` (JSON), `riseOfIxIntrigue.test.ts` |
| Turn history / UI | partial + manual | [10](./10-ui-regression.md) | `turnGainsDisplay.test.ts`, hosted scenarios |
| RoI leaders (6) | partial | `plans/rise-of-ix/07-leaders.md` | `leaderPool.test.ts`, `tessiaSnoopers.test.ts`, `tessiaSnooperIntegration.test.ts`, leader ability modules |
| Catalog v2 JSON | ✓ | — | `buildCatalog.test.ts`, `catalog.test.ts` |

## Rules checklist (Rise of Ix additions)

### Setup

- [ ] `riseOfIx` checkbox seeds `expansions`, `ixBoard`, `freighterStep`, dreadnought supply, negotiators (`expansionsFlag.test.ts`, `sandboxSetup.test.ts`, `leaderPool.test.ts`).
- [ ] Conflict deck = 22 cards (4 RoI + base mix) when flag on (`conflictPool.test.ts`, `conflictsRiseOfIx.test.ts`).
- [ ] Intrigue deck = 49 cards when flag on (`intrigueDeck.test.ts`).
- [ ] Imperium deck includes 35 RoI printings / 29 unique names (`buildImperiumDeck.test.ts`, `cardsRiseOfIxData.test.ts`, `riseOfIxImperium.test.ts`).

### New board spaces (ids 23–26)

- [ ] **Dreadnought** — 3 solari, commission + optional acquire tech (`boardSpaceTechNegotiation.test.ts`).
- [ ] **Tech Negotiation** — acquire tech (−1) OR place negotiator (`boardSpaceTechNegotiation.test.ts`).
- [ ] **Smuggling** — 1 solari + 1 freighter icon (`freighter.test.ts` via agent turn).
- [ ] **Interstellar Shipping** — requires SG influence ≥ 2, 2 freighter icons.
- [ ] Base spaces **Sell Melange (7)** and **Secure Contract (8)** hidden when RoI on (`boardSpaceAvailability.test.ts`).

### Units & combat

- [ ] Troop strength 2; dreadnought strength 3 (4 for Rhombur) (`combatStrength.test.ts`).
- [ ] Strength > 0 with dreadnoughts but zero troops (`dreadnoughts.test.ts`).
- [ ] Win with dreadnought → control-space OR choice; cover clears next combat (`dreadnoughts.test.ts`).
- [ ] Cannon Turrets retreats opponent dreadnought (`riseOfIxIntrigue.test.ts`).

### Freighter

- [ ] Advance 0→1→2→3 (cap at 3); Recall bundles step rewards (`freighter.test.ts`).
- [ ] Step 1: Dividends OR +2 spice; Dividends pays +5 active / +1 each opponent.
- [ ] Step 2: +2 troops + influence choice; Step 3: acquire tech (−2 spice).
- [ ] Multiple freighter icons → multiple Advance/Recall choices.
- [ ] `freighterStep` persists `END_TURN` and restores on `UNDO_TO_TURN`.

### Tech tiles

- [ ] `ACQUIRE_TECH` pays spice, returns negotiators, reveals next stack tile (`techTiles.test.ts`).
- [ ] Round Start flips used tiles face-up; Holtzman / Shuttle Fleet fire (`techTiles.test.ts`).
- [ ] Reveal / conflict-win / endgame hooks (`techTiles.test.ts`).
- [ ] `ACTIVATE_TECH` once-per-round tiles flip face-down (`techActivation.test.ts`).
- [ ] Troop Transports modifies shipping step-2 reward (`techTiles.test.ts`).

### Intrigue (17 cards)

- [ ] All 17 have reducer coverage (`riseOfIxIntrigue.test.ts`) — see [03](./03-intrigue-cards.md) matrix.
- [ ] Hybrid phase cards (War Chest, Finesse, Advanced Weaponry, Machine Culture) respect `GamePhase`.

### Logging & history

- [ ] Freighter `RESOLVE_CHOICE` JSON-serializable (`freighter.test.ts` + `assertJsonSerializable`).
- [ ] Turn history shows board space name, resource gains, freighter/tech sources (`09`, `10`).
- [ ] Save round-trip with RoI state (`saveRoundTrip.test.ts` when extended).

## Card inventory

| Pool | Base | RoI add | Total (flag on) |
|------|------|---------|-----------------|
| Imperium row printings | 67 | +35 | 102 in combined deck builder |
| Unique RoI imperium names | — | 29 | — |
| Intrigue | 32 | +17 | 49 |
| Conflicts | 18 | +4 (919–922) | 22 |
| Tech tiles | 0 | 18 | 18 |
| Leaders | 8 | +6 | 14 in pool |
| Board spaces | 22 | +4 (23–26) | 26 (7–8 unavailable) |

## Agent workflow after a change

1. `cd client && npm run test`
2. If card/catalog data changed: `cd client && npx tsx scripts/generate-catalogs.ts`
3. Fix RoI-specific failures before base failures (base must stay green).
4. For new card behavior: add `it(...)` to the matching file or `it.todo` with printed-text reference.
5. Run hosted scenarios in [10-ui-regression](./10-ui-regression.md) when touching UI, `TurnHistory`, freighter modal, or tech stacks modal.
6. Confirm `expansions.riseOfIx` false path still matches base game ([base 00-verification-test-plan](../../base-game/regression-test/00-verification-test-plan.md)).

## Known gaps (track here)

| Gap | Target test |
|-----|-------------|
| Per-card RoI imperium row effects (29 unique) | promote `riseOfIxImperium.test.ts` manifest `it.todo` entries into behavior tests as each card effect is wired |
| RoI leader abilities end-to-end | extend current leader ability module tests with reducer/UI paths for Rhombur, Hudro, Yuna, Armand, Ilesa, and Tessia |
| Ix board overlay component tests | `ImageBoard/__tests__/` (deferred) |
| Save round-trip with full RoI state | add a fixture covering freighter + tech + dreadnought + expansion setup in `saveRoundTrip.test.ts` |
| Turn history display for remaining RoI gain sources | extend `turnGainsDisplay.test.ts` for any missing dreadnought/control/tech labels |
| Combat phase full UI flow | [10-ui-regression](./10-ui-regression.md) scenarios C-* |
