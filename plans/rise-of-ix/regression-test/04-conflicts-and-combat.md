# Conflicts & combat (Rise of Ix)

4 new conflict cards (ids **919–922**); pool grows from 18 → **22** when `riseOfIx` is on.

## Conflict table

| ID | Name | Tier | First-place highlights |
|----|------|------|------------------------|
| 919 | Skirmish IV | I | +1 troop, **freighter** choice |
| 920 | Skirmish V | I | +1 spice, **freighter** choice |
| 921 | Economy Supremacy | III | +1 VP, **VP OR tech** choice (6 solari / 4 spice / acquire tech) |
| 922 | Trade Monopoly | II | +1 troop, **two freighter** choices |

Data: `client/src/data/conflictsRiseOfIx.ts`.

## Automated

| ID | Assertion | File |
|----|-----------|------|
| CX-01 | Pool length 22 with RoI | `conflictPool.test.ts` |
| CX-02 | Skirmish IV first → troop + freighter pending choice | `conflictRewards.test.ts` |
| CX-03 | Trade Monopoly → two freighter choices | `conflictRewards.test.ts` |
| CX-04 | Economy Supremacy → VP + acquire-tech choice path | `conflictRewards.test.ts` |
| CX-05 | No freighter/tech handlers when flag off | `conflictRewards.test.ts` |
| CX-06 | Dreadnought strength in combat formula | `combatStrength.test.ts` |
| CX-07 | Rhombur dreadnought strength = 4 | `combatStrength.test.ts`, `dreadnoughts.test.ts` |
| CX-08 | Win + dreadnought → control OR detonation (tech) | `dreadnoughts.test.ts`, `techTiles.test.ts` |
| CX-09 | Losing combat: dreadnoughts → garrison | `dreadnoughts.test.ts` |
| CX-10 | Base combat tie rules still apply with RoI units | inherit `conflictsBase.test.ts` |

## Combat resolution flow (RoI additions)

1. **Set strength** — troops × 2 + dreadnoughts × 3 (× 4 Rhombur) + swords; 0 troops allowed if dreadnoughts present.
2. **Combat intrigue** — Cannon Turrets, Blackmail, Second Wave, etc. (`riseOfIxIntrigue.test.ts`).
3. **Resolve combat** — standard rank rewards + RoI freighter/tech enqueue (`conflictRewards.test.ts`).
4. **Post-combat tech** — Windtraps (+water), Detonation Devices (OR choice) (`techTiles.test.ts`).
5. **Dreadnought cover** — winner may place in control space; returns after next combat (`dreadnoughts.test.ts`).

## Todo

| ID | Rule | Suggested test |
|----|------|----------------|
| CX-20 | Skirmish V rewards (920) full resolve | `conflictRewards.test.ts` |
| CX-21 | Economy Supremacy paid VP branches (−6 solari / −4 spice) | reducer + choice |
| CX-22 | 4p third-place with freighter reward | multi-player `resolveCombat` |
| CX-23 | Combat strength UI updates after dreadnought deploy | [10-ui-regression](./10-ui-regression.md) **UI-COMBAT-*** |

## UI scenarios

See [10-ui-regression.md](./10-ui-regression.md):

- **UI-COMBAT-01** — Deploy troop + dreadnought, set strength, resolve
- **UI-COMBAT-02** — Play RoI combat intrigue, verify strength marker
- **UI-COMBAT-03** — Win conflict with Economy Supremacy, resolve tech choice
