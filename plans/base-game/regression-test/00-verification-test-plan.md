# Base game verification — master test plan

For **Cursor cloud agents** and humans validating that Dune: Imperium **base game** behavior and UI have not regressed when adding expansions or refactors.

## Run command

```bash
cd client && npm run test
```

- **Green `it(...)`** = must stay passing.
- **`it.todo(...)`** = specified behavior not yet automated; implement when touching that area.
- One known failing test may exist in `intrigueCards.test.ts` (Seek Allies reveal) — fix or skip before treating CI as fully green.

## Coverage map

| Area | Automated | Plan doc | Primary test file |
|------|-----------|----------|-------------------|
| Card manifest vs spreadsheet | ✓ | [02-imperium-cards](./02-imperium-cards.md) | `baseGameManifest.test.ts` |
| Imperium row effects | stubs (89 todo) | 02 | `imperiumRowCards.test.ts` |
| Starting deck | partial | 02 | `intrigueCards.test.ts`, todos |
| Intrigue (34 base) | ~32 implemented | [03-intrigue-cards](./03-intrigue-cards.md) | `intrigueCards.test.ts` |
| Conflicts | partial | [04-conflicts](./04-conflicts.md) | `conflictsBase.test.ts` |
| Board spaces (22) | data + hotspots | [05-board-spaces](./05-board-spaces.md) | `boardSpaces.test.ts` |
| Round structure | partial | [01-round-structure](./01-round-structure.md) | `roundStructure.test.ts` |
| Board / footer / turn history UI | manual only (deferred) | 06 | `src/__tests__/deferred/` (excluded from `npm test`) |

## Rules checklist (from `.cursor/rules/round-structure.mdc`)

### Phase 1 — Round start

- [ ] Reveal new conflict card (on top of discard pile).
- [ ] Each player draws 5 cards.
- [ ] `SELECT_CONFLICT` → `PLAYER_TURNS`, first player active (`roundStructure.test.ts`).

### Phase 2 — Player turns

- [ ] Agent turn: one card, one agent icon, one unoccupied space (unless Voice / Infiltrate).
- [ ] Pay space cost **before** resolving effects.
- [ ] Agent box only on agent turn; reveal box only on reveal turn.
- [ ] Optional costs (arrow effects) never forced.
- [ ] Combat space: deploy 0–all turn recruits + up to 2 from garrison.
- [ ] Reveal: all hand cards, resolve reveal effects in any order, acquire with persuasion, set strength, clean up to discard.
- [ ] After reveal, player skips until phase end.
- [ ] Plot intrigue any time on own agent/reveal turn.

### Phase 3 — Combat

- [ ] Only players with troops in conflict may play combat intrigue; pass order from first player.
- [ ] Strength: 2 per conflict troop + swords; 0 troops ⇒ 0 strength.
- [ ] Rewards by rank; 4p third place; tie rules.
- [ ] Troops to supply after combat; markers reset.
- [ ] `RESOLVE_COMBAT` → `ROUND_START` (`conflictsBase.test.ts`).

### Phase 4 — Makers

- [ ] +1 bank spice on each maker space **without** an agent (todo in reducer).

### Phase 5 — Recall

- [ ] Mentat to Landsraad; recall agents; pass first player (todo in reducer).
- [ ] Endgame if any player ≥10 VP or conflict deck empty (todo).

## Card inventory (spreadsheet filter: base)

Source: [IR & Intrigue xlsx](http://dropbox.com/scl/fi/sidtjr4vako4lo7zba8bk/Dune_Imperium_IR_and-Intrige_Cards.xlsx?rlkey=qlwkii0fty3xh2n8mezbkwkob&e=2&dl=0), column `Base/Ix/Immo` = `1. base` or `base`.

| Pool | Count | Manifest key |
|------|-------|----------------|
| Imperium row (unique names) | 43 | `imperiumRow` |
| Intrigue | 34 | `intrigue` |
| Conflicts (variants) | 18 | `conflicts` |
| Leaders | 8 | `leaders` |
| Starting deck | 10 | `STARTING_DECK` in code |

**Known data gaps (track in tests):**

- Intrigue not in app yet: Demand Respect, Poison Snooper.
- Conflicts in sheet but not in `CONFLICTS.ts`: Guild Bank Raid, Raid Stockpiles, Terrible Purpose, Grand Vision (aliases map to `null`).

## Agent workflow after a change

1. `cd client && npm run test`
2. If card data changed: `python3 client/scripts/generate-base-game-manifest.py`
3. Fix any new manifest failures (`baseGameManifest.test.ts`).
4. For new card behavior: replace matching `it.todo` in `imperiumRowCards.test.ts` or add to `intrigueCards.test.ts`.
5. Manual UI pass per [06-ui-regression](./06-ui-regression.md) if touching `ImageBoard`, `TurnControls`, `TurnHistory`, or `App.css`.

## Expansion policy

- Base tests must pass with default game (no expansion flags).
- Add expansion-specific manifests under `plans/<expansion>/` mirroring this folder.
- Do not remove base `it.todo` entries when adding expansions — implement or gate separately.
