# Round structure tests

Official order: **Round Start → Player Turns → Combat → Makers → Recall**.

## Automated

| ID | Assertion | File |
|----|-----------|------|
| RS-01 | Fresh state `phase === ROUND_START` | `roundStructure.test.ts` |
| RS-02 | `SELECT_CONFLICT` → `PLAYER_TURNS`, active = first player | same |
| RS-03 | Zero conflict troops ⇒ zero strength | same |
| RS-04 | `RESOLVE_COMBAT` clears troops, → `ROUND_START` | `conflictsBase.test.ts` |

## Todo (engine / UI)

| ID | Rule | Suggested test |
|----|------|----------------|
| RS-10 | Draw 5 at round start | After round start action, `handCount === 5` |
| RS-11 | All revealed → combat phase | Multi-player reveal sequence |
| RS-12 | Makers bonus spice | `bonusSpice` increments on empty maker spaces |
| RS-13 | Recall agents + pass FP | `occupiedSpaces` empty; `firstPlayerMarker` +1 mod n |
| RS-14 | Endgame trigger 10 VP | `ADVANCE` from recall with VP≥10 |

## Examples to script manually

1. Player A agent to Wealth → gains 2 Solari + card effect; history shows "Wealth".
2. Player B reveal with 0 agents left → persuasion spend, strength set, play area cleared.
3. Combat tie for first → both get second reward (4p third still contested).
