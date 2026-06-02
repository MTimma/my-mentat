# Base game verification (Dune: Imperium)

Agent-oriented test plan and automated checks for the **base game only** (no Rise of Ix, Immortality, etc.).

## Sources

| Source | URL |
|--------|-----|
| Rules (PDF) | [DUNE_IMPERIUM_Rules_2020_10_26.pdf](https://d19y2ttatozxjp.cloudfront.net/pdfs/DUNE_IMPERIUM_Rules_2020_10_26.pdf) |
| Rules (doc) | [Google Doc](https://docs.google.com/document/d/15FrreNVs2eAnEWlNCmChQuBr5LLg0HHgC7BqWGk7KYw/edit) |
| Card spreadsheet | [IR & Intrigue xlsx (Dropbox)](http://dropbox.com/scl/fi/sidtjr4vako4lo7zba8bk/Dune_Imperium_IR_and-Intrige_Cards.xlsx?rlkey=qlwkii0fty3xh2n8mezbkwkob&e=2&dl=0) |
| Cursor rules | `.cursor/rules/round-structure.mdc`, `board-spaces.mdc`, `full-rules.mdc` |

## Quick verify (CI / cloud agent)

From repo root:

```bash
cd client && npm run test
```

Expected: all tests **green**; `it.todo` entries are intentional backlog, not failures.

Regenerate card manifest after spreadsheet changes:

```bash
python3 client/scripts/generate-base-game-manifest.py
```

## Document map

| File | Purpose |
|------|---------|
| [00-verification-test-plan.md](./00-verification-test-plan.md) | Master checklist: rules, cards, UI |
| [01-round-structure.md](./01-round-structure.md) | Five phases, turn order, combat ties |
| [02-imperium-cards.md](./02-imperium-cards.md) | Imperium row + starting deck matrix |
| [03-intrigue-cards.md](./03-intrigue-cards.md) | Plot / combat / endgame intrigue |
| [04-conflicts.md](./04-conflicts.md) | Conflict deck tiers and rewards |
| [05-board-spaces.md](./05-board-spaces.md) | All board spaces, costs, control |
| [06-ui-regression.md](./06-ui-regression.md) | Layout stability, markers, turn history |

## Code locations

| Area | Tests |
|------|-------|
| Manifest / data integrity | `client/src/components/GameContext/__tests__/baseGameManifest.test.ts` |
| Round structure | `client/src/components/GameContext/__tests__/roundStructure.test.ts` |
| Imperium cards (stubs) | `client/src/components/GameContext/__tests__/imperiumRowCards.test.ts` |
| Conflicts | `client/src/components/GameContext/__tests__/conflictsBase.test.ts` |
| Board spaces | `client/src/components/GameContext/__tests__/boardSpaces.test.ts` |
| Intrigue (implemented) | `client/src/components/GameContext/__tests__/intrigueCards.test.ts` |
| UI (deferred, not in CI) | `client/src/__tests__/deferred/` — manual QA: [06-ui-regression.md](./06-ui-regression.md) |
| Shared helpers | `client/src/components/GameContext/__tests__/_helpers.ts` |
| Card manifest JSON | `client/src/test-fixtures/base-game-manifest.json` |

## Expansion workflow

When adding an expansion:

1. Add expansion cards to spreadsheet; filter a new manifest (or extend `generate-base-game-manifest.py`).
2. Duplicate the manifest test pattern under `plans/<expansion>/`.
3. Keep **base** tests green — they must not depend on expansion flags unless explicitly gated with `expansions.riseOfIx` (etc.).
