# Rise of Ix regression verification

Regression checklist for confirming that Rise of Ix rules and UI workflows are
covered as the expansion implementation lands.

My Mentat is a logging and analysis tool for physical Dune: Imperium games. The
checks below therefore verify tracked public state, user prompts, board chrome,
manual overrides, save/history behavior, and rule-specific reducer outcomes. They
do not require hidden deck state or a fully automated hot-seat game engine.

## Quick verify

From the `client/` directory:

```bash
npm run test
npm run build
```

Expected: all runnable tests are green. Intentional `it.todo(...)` entries are
allowed while a specific Rise of Ix task is still in progress.

## Document map

| File | Purpose |
|------|---------|
| [01-rules-and-unit-tests.md](./01-rules-and-unit-tests.md) | Unit-test tasks mapped to Rise of Ix rules/functionality. |
| [02-ui-regression.md](./02-ui-regression.md) | Manual multi-game UI click-through checklist. |

## Required completion signal

For each implemented Rise of Ix feature:

1. Add or enable the matching unit tests in
   `client/src/components/GameContext/__tests__/` or
   `client/src/utils/__tests__/`.
2. Keep base-game regression tests green with the expansion flag off.
3. Run the UI checklist for at least the relevant game styles in
   `02-ui-regression.md`.
4. Record any not-yet-testable feature as an explicit gap rather than silently
   treating it as covered.
