# 07 — Game Packs

A **game pack** is the single source of truth for how a game is configured: which
expansions and structure presets apply, plus optional rule overlays (nerfs,
community cards). Event logs pin `setup.gamePackId@version`; the engine resolves
the pack at genesis and replay.

## Three layers

| Layer | Example | Role |
|-------|---------|------|
| **Catalog version** | `catalogVersion: 1` | Engine rules dataset (`public/catalogs/*.v1.json`) |
| **Game pack** | `official/base+riseOfIx@1` | Structure preset + optional overrides |
| **Save setup** | `setup.gamePackId` | Frozen reference for this game |

```text
catalog.v1 + resolve(gamePackId) → merged catalog → buildInitialState(setup)
```

## Pack manifest shape

Bundled under `client/public/game-packs/`. Canonical ref: `<id>@<version>`.

```jsonc
{
  "schemaVersion": 1,
  "id": "official/base+riseOfIx",
  "version": 1,
  "label": "Base + Rise of Ix",
  "catalogVersion": 1,
  "extends": "official/base@1",
  "structure": {
    "expansions": { "riseOfIx": true, "riseOfIxEpic": false },
    "playerMode": "standard"
  },
  "overrides": {
    "effects": {},
    "cards": {},
    "boardSpaces": {},
    "intrigue": {},
    "conflicts": {}
  },
  "additions": {
    "cards": [],
    "intrigue": [],
    "deckPatches": {}
  }
}
```

- **structure** — expansion flags, player mode, future: board set, deck recipes.
- **overrides** — deltas keyed by stable catalog ids (`effect:…`, card slug, space id).
- **additions** — new catalog entries (community cards); Phase 2+.

## Replay pinning

New games write `setup.gamePackId` (e.g. `official/base@1`). Legacy saves without
it infer from `setup.expansions.riseOfIx`.

Future: `setup.gamePackSnapshot` or content hash when packs are DB-hosted and may
be deleted.

## Customization tiers

1. **Declarative** — override effect/card/space fields in `overrides` (no reducer change).
2. **Existing opcode** — new card references `custom: "THE_VOICE"` from published enum.
3. **New behavior** — new `CustomEffect` + reducer handler + app release.

Published user packs should stay within tiers 1–2 unless `minEngineVersion` is bumped.

## Phases

- **Phase 1 (done in client):** Official bundled packs, resolver, catalog merge,
  `setup.gamePackId`, setup UI dropdown, legacy inference.
- **Phase 2:** User packs (`user/<slug>@N`), community card additions, validation.
- **Phase 3:** Uprising / Immortality / Bloodlines structure presets.
- **Phase 4:** DB `game_packs` table, publish flow, `GET /v1/game-packs/{ref}`.

## Module map

- `client/src/gamePacks/` — types, registry, `resolveGamePack`, `inferGamePackId`
- `client/src/catalog/mergeCatalogOverlay.ts` — apply overrides to catalog slices
- `client/src/catalog/runtime/` — `createCatalogRuntime(resolvedPack?)`
- `client/src/save/buildInitialState.ts` — resolve pack before hydrate
