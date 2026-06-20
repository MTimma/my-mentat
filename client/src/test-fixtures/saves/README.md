# Golden save fixtures

Event-sourced `SaveDoc` JSON files for replay and turn-history display regression tests.

## Export a game from the app

1. Play a scenario in the app.
2. Open **Turn History** → debug (details) button → **Save document** tab.
3. Click **Download .json** or **Copy**.
4. Save the file here as `<descriptive-name>.json` (kebab-case).

Or from the repo root:

```bash
node client/scripts/add-save-fixture.mjs path/to/export.json my-game
```

Use the **Save document** export only. The Runtime tab is not replayable.

## Run display regression tests

```bash
cd client
npm run test -- goldenSaveDisplay
```

After intentional UI or display changes, refresh snapshots:

```bash
npm run test -- goldenSaveDisplay -u
```

## Regenerate the seed fixture

```bash
cd client
npx tsx scripts/seed-save-fixture.mts
```

Writes `agent-reveal-two-turns.json` (2p agent + reveal turns).

## What is tested

For each `*.json` in this directory:

1. `replaySaveDoc` — no checksum divergences
2. `buildHistoryFromEvents` — history rebuilds
3. `projectTurnHistory` — stable per-row display projection (Vitest snapshot)
