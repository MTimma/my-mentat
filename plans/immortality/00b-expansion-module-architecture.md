# Task 00b — Expansion module registry + `boardSet`

## Goal

Introduce a small expansion-plugin layer so Immortality (and a future Rise of Ix
migration) can attach board overlays, markers, and hotspots **without** base
files (`ImageBoard`, `App`, the main reducer) accumulating per-expansion `if`
branches, and so the same expansion code works against any **board set**
(`imperium` now, `uprising` later).

## Files

| File | Change |
|------|--------|
| `client/src/expansions/types.ts` | **New** — `BoardSetId`, `ExpansionBoardLayer`, `ExpansionModule`. |
| `client/src/expansions/registry.ts` | **New** — `registerExpansionModule`, `activeExpansionModules(expansions)`, `expansionBoardLayersFor(expansions, boardSet)`. |
| `client/src/gamePacks/types.ts` | Add `boardSet: BoardSetId` to `GamePackStructure`. |
| `client/src/gamePacks/resolveGamePack.ts` | Default/merge `boardSet` (missing ⇒ `'imperium'`). |

## Design

```ts
export type BoardSetId = 'imperium' | 'uprising'

export interface ExpansionBoardLayer {
  /** `<img>` overlays drawn on the main board (inner 0–100 rects). */
  overlays?: ExpansionOverlay[]
  /** Per-player marker anchors (track tokens, etc.). */
  markers?: ExpansionMarkerSet
}

export interface ExpansionModule {
  id: string
  isEnabled: (exp: Expansions) => boolean
  /** Board layers keyed by board set; absent key ⇒ no board contribution. */
  boardLayers?: Partial<Record<BoardSetId, ExpansionBoardLayer>>
}
```

The registry holds an ordered array of registered modules. `ImageBoard` asks the
registry for `boardLayers[boardSet]` of every enabled module and renders them;
it never imports `immortality/*` directly.

## Acceptance

- `activeExpansionModules({ immortality:false, riseOfIx:false })` returns `[]`.
- Game packs resolve a `boardSet` (default `imperium`).
- No base file imports a concrete expansion module except `registry.ts`
  (which performs the registrations).
