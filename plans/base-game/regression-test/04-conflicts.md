# Conflicts (base)

18 conflict **variants** in spreadsheet; `CONFLICTS.ts` has 15 entries (some names differ — see manifest aliases).

## Tier structure (deck building)

| Tier | Rounds | Count in pool (rules) |
|------|--------|------------------------|
| 1 | 1 | 1 drawn |
| 2 | 2–6 | 4 |
| 3 | 7+ | 5 |

## Per-conflict tests

| ID | Conflict | First reward | Control? |
|----|----------|--------------|----------|
| C-01 | Skirmish (×4 variants) | VP / inf+spice / etc. | No |
| C-02 | Siege of Arrakeen | VP + control Arrakeen | Yes |
| C-03 | Siege of Carthag | VP + control Carthag | Yes |
| C-04 | Siege of Imperial Basin | VP + control Basin | Yes |
| C-05 | Cloak and Dagger | 2 intrigue | No |
| C-06 | Machinations | 2 influence (choose) | No |
| … | See `conflicts.ts` | | |

## Resolution tests (todo)

- `conflictsBase.test.ts`: ties, 3p vs 4p third reward, 0 strength, control marker placement, defensive deploy when conflict matches controlled space.

## Spreadsheet-only (not in `CONFLICTS.ts`)

Guild Bank Raid, Raid Stockpiles, Terrible Purpose, Grand Vision — add data or remove from base manifest when confirmed out of scope.
