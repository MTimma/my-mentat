# UI regression (base game)

My Mentat is a **tracker**, not a full digital board game — tests focus on visible chrome matching game state.

> **Automated UI tests are deferred.** Scaffolding lives in `client/src/__tests__/deferred/` and is **excluded** from `npm run test` until layout/history contracts stabilize. Use the checklist below for manual QA.

## Turn controls / footer (no layout jump)

**Goal:** Resizing the window or adding gain chips / selected card must not shift the board vertically.

| ID | Check | Automated |
|----|-------|-----------|
| UI-01 | `--turn-controls-measured-height` + `.turn-controls-spacer` in `App.css` | `layoutStability.test.tsx` |
| UI-02 | `.game-container--play .turn-controls-container` pinned in footer | same |
| UI-03 | `.turn-controls` full width, `border-box` | same |
| UI-04 | Manual: play agent turn with effects row → footer height stable | todo e2e |
| UI-05 | Manual: docked turn history (desktop) — board column width stable | todo e2e |

## Trackers on board image

| ID | Check | Automated |
|----|-------|-----------|
| UI-10 | Hotspot ⊆ [0,100] inner coords | `boardLayout.test.ts` |
| UI-11 | Marker anchor = hotspot center formula | same |
| UI-12 | Manual: VP markers track score per player lane | manual |
| UI-13 | Manual: influence cubes on faction tracks | manual |
| UI-14 | Manual: combat strength markers on track | manual |

Debug URLs: `?markerDebug=1`, `?hotspotDebug=1`.

## Agents on spaces

| ID | Check |
|----|-------|
| UI-20 | Agent appears only on `occupiedSpaces` space ids |
| UI-21 | Agent color matches `player.color` |
| UI-22 | Cannot click occupied space (unless Infiltrate / Voice) |

Component test todo in `boardLayout.test.ts`.

## Turn history

| ID | Check | Automated |
|----|-------|-----------|
| UI-30 | Agent turn label = board space name (`agentSpaceId`) | `TurnHistory.test.tsx` |
| UI-31 | Gains row shows resources (e.g. Solari) | same |
| UI-32 | Played card thumbnail visible | todo |
| UI-33 | Reveal turn shows "Reveal" + persuasion | todo |
| UI-34 | Undo / navigate turns preserves labels | manual |

`currTurn` fields: `cardId`, `agentSpaceId`, `type`; `gains[]` filtered by `playerId`.

## Suggested Playwright smoke (future)

```ts
// Pseudocode for cloud agent extension
test('footer does not move board', async ({ page }) => {
  const boardBox = await page.locator('.image-board').boundingBox()
  await page.getByRole('button', { name: 'End Turn' }).click()
  expect(await page.locator('.image-board').boundingBox()).toEqual(boardBox)
})
```

Not yet in repo — add under `e2e/` when needed.
