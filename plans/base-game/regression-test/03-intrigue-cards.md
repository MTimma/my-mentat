# Intrigue cards (base)

34 cards in manifest; **32** implemented in `IntrigueDeckService.ts`.

## Implemented suite

`client/src/components/GameContext/__tests__/intrigueCards.test.ts` — plot, combat, endgame, Power Play, SMF acquire.

## Not in codebase yet

| Excel name | Manifest `codeName` | Action |
|------------|---------------------|--------|
| Demand Respect | Demand Respect | Add card data + test |
| Poison Snooper | Poison Snooper | Add card data + test |

## Test matrix by type

### Plot (player turns)

For each: play with `PLAY_INTRIGUE`, assert resources/flags/pending choices, optional `RESOLVE_CHOICE`.

Examples already covered: Windfall, Bribery, Bypass Protocol, Infiltrate, Calculated Hire, …

### Scheduled on reveal

Play plot during turn → `REVEAL_CARDS` → assert delayed effect (Charisma, Recruitment Mission).

### Combat

Setup `phase: COMBAT`, `combatTroops` / `combatStrength`, `PLAY_COMBAT_INTRIGUE`, adjust strength, resolve combat for “when you win” cards.

### Endgame

`phase: END_GAME`, play card, `RESOLVE_ENDGAME` for tiebreakers.

## Agent checklist for new intrigue

1. Add to `intrigueCards` array with correct `id`, `type`, `playEffect`.
2. Add `it('Name (id): …')` mirroring printed text from spreadsheet **Card Benefit** column.
3. Update manifest test allowlist if name alias differs from Excel.
