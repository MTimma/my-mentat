# Dreadnoughts & units

**Unit** = troop ∪ dreadnought. Each player starts with **2 dreadnoughts in supply** when RoI is on.

## Zones (`Player.dreadnoughts`)

| Zone | Meaning |
|------|---------|
| `supply` | Uncommissioned (max 2 active in play total) |
| `garrison` | Commissioned, not in conflict |
| `conflict` | In current conflict |
| `control` | Covering Arrakeen / Carthag / Imperial Basin (`{ space, placedRound }`) |

Helpers: `client/src/utils/dreadnoughts.ts`, `dreadnoughtLifecycle.ts`.

## Automated (`dreadnoughts.test.ts`)

| ID | Assertion |
|----|-----------|
| DN-01 | `COMMISSION` → `garrison` +1 |
| DN-02 | Commission capped at 2 active (supply + garrison + conflict + control) |
| DN-03 | Commission at combat space → OR choice (garrison vs conflict) |
| DN-04 | Choose conflict → `dreadnoughts.conflict` +1 |
| DN-05 | `computeStrength`: troops×2 + dreads×3 + swords |
| DN-06 | Rhombur: dreads×4 |
| DN-07 | Strength ≥ 0 with 0 troops but dreadnoughts in conflict |
| DN-08 | Win combat with dreadnought → control-space choice |
| DN-09 | Pick Imperial Basin → `control[0]` populated |
| DN-10 | `dreadnoughtCover[space]` = winner after choice |
| DN-11 | Next combat: cover dread returns to garrison, cover clears |
| DN-12 | Lose combat: dreadnoughts → garrison (not supply) |
| DN-13 | `DEPLOY_DREADNOUGHT` garrison → conflict |

## Pure utils (`utils/__tests__/dreadnoughts.test.ts`, `combatStrength.test.ts`)

| ID | Assertion |
|----|-----------|
| DN-20 | `unitsInConflictForPlayer` counts troops + dreadnoughts |
| DN-21 | `getDreadnoughtsInConflict` |
| DN-22 | Troop deploy limits still apply alongside dreadnought deploy |

## Board space

**Dreadnought** (id 23): 3 solari, `{ dreadnoughts: 1, acquireTech: {} }`.

## Intrigue interaction

- **Cannon Turrets** — each opponent retreats 1 dreadnought from conflict (`riseOfIxIntrigue.test.ts`).
- **Advanced Weaponry** (plot) — commission dreadnought.
- **Diversion** — counts units (troops + dreadnoughts) in conflict for freighter.

## Todo

| ID | Item |
|----|------|
| DN-30 | `UNDEPLOY_DREADNOUGHT` / retreat from conflict UI |
| DN-31 | Control bonus when visiting covered space |
| DN-32 | Agent icon `dreadnought` variant on board (`AgentIcon` component) |
| DN-33 | Combat deploy strip shows dreadnought count separate from troops |

## UI scenarios

[10-ui-regression.md](./10-ui-regression.md) **UI-DREAD-*** series.
