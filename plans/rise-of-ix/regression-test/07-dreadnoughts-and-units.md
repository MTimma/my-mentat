# Dreadnoughts & RoI units

Rise of Ix adds two dreadnoughts per player. A dreadnought can be commissioned, kept in garrison, deployed to the conflict, contribute combat strength, and cover a Dune control space after winning a conflict.

**Unit** = troop or dreadnought.

## Zones (`Player.dreadnoughts`)

| Zone | Meaning |
|------|---------|
| `supply` | Uncommissioned dreadnoughts |
| `garrison` | Commissioned dreadnoughts not in conflict |
| `conflict` | Dreadnoughts in the current conflict |
| `control` | Dreadnoughts covering Arrakeen / Carthag / Imperial Basin (`{ space, placedRound }`) |

Helpers: `client/src/utils/dreadnoughts.ts`, `dreadnoughtLifecycle.ts`.

## Automated

| ID | Assertion | File |
|----|-----------|------|
| DN-01 | Commission reward moves one dreadnought from supply to garrison | `dreadnoughts.test.ts` |
| DN-02 | Commission is capped at two active dreadnoughts | `dreadnoughts.test.ts` |
| DN-03 | Commission on a combat space offers garrison OR conflict deploy | `dreadnoughts.test.ts` |
| DN-04 | Conflict deploy choice moves the dreadnought directly into conflict | `dreadnoughts.test.ts` |
| DN-05 | `DEPLOY_DREADNOUGHT` moves a garrison dreadnought into conflict | `dreadnoughts.test.ts` |
| DN-06 | `unitsInConflictForPlayer` counts troops plus dreadnoughts | `utils/__tests__/dreadnoughts.test.ts` |
| DN-07 | Combat strength includes troops * 2 + dreadnoughts * 3 + swords | `combatStrength.test.ts`, `dreadnoughts.test.ts` |
| DN-08 | Rhombur's dreadnoughts count as 4 strength each | `combatStrength.test.ts`, `rhombur.test.ts` |
| DN-09 | A player can have combat strength with dreadnoughts even at zero troops | `combatStrength.test.ts`, `dreadnoughts.test.ts` |
| DN-10 | Winning combat with a dreadnought creates a control-space choice | `dreadnoughts.test.ts` |
| DN-11 | Occupied dreadnought-cover spaces are omitted from the control choice | `dreadnoughts.test.ts` |
| DN-12 | Control choice places the dreadnought on the selected control space | `dreadnoughts.test.ts` |
| DN-13 | Dreadnought cover is recorded in `dreadnoughtCover` | `dreadnoughts.test.ts` |
| DN-14 | Cover clears and dreadnought returns to garrison after the next combat | `dreadnoughts.test.ts` |
| DN-15 | Losing combat returns conflict dreadnoughts to garrison, not supply | `dreadnoughts.test.ts` |

## Board-space integration

| ID | Rule | Automated check |
|----|------|-----------------|
| DN-BS-01 | **Dreadnought** space costs 3 solari | `boardSpaceCostGains.test.ts`, `boardSpaceTechNegotiation.test.ts` |
| DN-BS-02 | Dreadnought space auto-commissions and offers optional Acquire Tech | `boardSpaceTechNegotiation.test.ts` |
| DN-BS-03 | Optional Acquire Tech does not block commission | `boardSpaceTechNegotiation.test.ts` |
| DN-BS-04 | Already-active dreadnought cap prevents extra commission from the board space | `boardSpaceTechNegotiation.test.ts` |

## Combat and conflict interactions

| ID | Rule | Coverage |
|----|------|----------|
| DN-CX-01 | Dreadnoughts contribute strength before combat rewards resolve | `combatStrength.test.ts` |
| DN-CX-02 | Winner with a dreadnought may cover Arrakeen, Carthag, or Imperial Basin | `dreadnoughts.test.ts` |
| DN-CX-03 | Cannon Turrets retreats an opponent dreadnought | `riseOfIxIntrigue.test.ts` |
| DN-CX-04 | Detonation Devices offers its alternate winner path | `techTiles.test.ts` |

## UI scenarios

Hosted click paths:

- [10-ui-regression.md](./10-ui-regression.md) **UI-BOARD-04** — Dreadnought commission.
- [10-ui-regression.md](./10-ui-regression.md) **UI-COMBAT-01** — Dreadnought deploy + strength.
- [10-ui-regression.md](./10-ui-regression.md) **UI-COMBAT-02** — RoI combat intrigue affecting dreadnought combat.

## Todo / extensions

| ID | Item | Suggested test |
|----|------|----------------|
| DN-20 | Undo after dreadnought control choice restores control and garrison state | `undoTurnGains.test.ts` or `dreadnoughts.test.ts` |
| DN-21 | Turn-history display for dreadnought commission, deploy, retreat, and cover | `turnGainsDisplay.test.ts` |
| DN-22 | Save round-trip with dreadnought control cover | `saveRoundTrip.test.ts` RoI fixture |
