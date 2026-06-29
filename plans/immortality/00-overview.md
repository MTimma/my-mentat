# Immortality — Implementation Plan (Overview)

This folder mirrors [`plans/rise-of-ix/`](../rise-of-ix/00-overview.md) and tracks the
implementation of the **Immortality** expansion in the `my-mentat` logging tool.

> **App context.** `my-mentat` is a hand-play **logging / database tool**, not a
> simulator. We never shuffle or randomize decks — the user selects the Imperium
> Row, Tleilaxu Row, and deck pool membership. We extend reducer state and render
> the new board + cards; anywhere the base game records a manual decision, we
> mirror that.

## Sources

1. Official rules PDF — [Immortality rulebook](https://boardgame.bg/dune%20imperium%20immortality%20rules.pdf).
2. Internal direction — [`.cursor/immortality`](../../.cursor/immortality) (card tables + UX notes).
3. Card text — [Google FAQ](https://docs.google.com/document/d/15FrreNVs2eAnEWlNCmChQuBr5LLg0HHgC7BqWGk7KYw/edit)
   and the Dropbox card spreadsheet.
4. Asset inventory under `client/public/board/immortality/`,
   `client/public/imperium_row/immortality/`,
   `client/public/tleilaxu_row/immortality/`,
   `client/public/intrigue/immortality/`, and shared icons in `client/public/icon/`.

## Scope

| Area | Immortality change |
|------|--------------------|
| Expansion flag | `immortality: boolean` on `Expansions` (composable with base and/or Rise of Ix) |
| Board set | `boardSet: 'imperium' \| 'uprising'` on the game-pack structure (base-agnostic) |
| Imperium deck | +30 Immortality Imperium cards |
| Tleilaxu deck | +18 Tleilaxu Row cards + Reclaimed Forces reserve |
| Intrigue deck | +15 Intrigue cards |
| Starter deck | 2× Dune, the Desert Planet → 2× Experimentation |
| Board | Bene Tleilax board panel + Research Station overlay (combat, 2 water, draw 2 + research) |
| Per-player | specimens in Axolotl tanks, research-track position + gene unlocks, Tleilaxu-track step, Family Atomics used |
| Agent turn | Graft pairs (2 cards, shared agent) |

**Does NOT add:** new leaders, new conflict cards.

## Architecture (see [`00b`](./00b-expansion-module-architecture.md))

1. **Module isolation** — all Immortality code/anchors live under
   `client/src/expansions/immortality/`; base files delegate through the
   expansion registry (`client/src/expansions/registry.ts`).
2. **Base-agnostic** — board anchors and board-space overrides are keyed by
   `boardSet`; no imperium-only space ids in expansion code.

## Execution order

1. `00b` — Expansion module registry + `boardSet`.
2. `01` — `immortality` flag + game packs + setup wiring.
3. `02` — Types (shared `GameTypes` + `expansions/immortality/types.ts`).
4. `03` — Catalog data (30 Imperium + 18 Tleilaxu + 15 Intrigue).
5. `04` — Board overlays + markers per `boardSet`.
6. `06` — Specimens + Tleilaxu track.
7. `05` — Research track.
8. `07` — Tleilaxu Row UI + acquire.
9. `10` — Starter deck + setup.
10. `11` — Research Station override.
11. `08` — Graft.
12. `09` — Family Atomics.
13. `12`–`14` — Per-card reducer hooks.
14. `15` — Tests.

## Cross-cutting principles

1. Module isolation (above).
2. Base-agnostic anchors keyed by `boardSet`.
3. Toggle isolation — `immortality === false` ⇒ identical to today.
4. Backwards-compatible saves — `normalizeExpansions()` defaults `immortality: false`;
   missing `boardSet` ⇒ `'imperium'`.
5. New state fields live in `history` snapshots (time travel).
6. No deck randomization.

## Glossary

- **Specimen** — a troop piece placed in the Axolotl tanks; currency for Tleilaxu cards.
- **Research** — advance the research token one space along the branching hex track.
- **Tleilaxu (beetle)** — advance the linear Tleilaxu track one space.
- **Graft** — play two cards on one Agent turn, sharing a single agent placement.
- **Genetic marker / gene unlock** — research-track breakthroughs (gate `genetic` card effects).
- **Family Atomics** — once-per-game refresh of the Imperium Row.
