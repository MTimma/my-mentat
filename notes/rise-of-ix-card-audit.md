# Rise of Ix imperium card audit

> Generated 2026-11-05. Re-run with
> `cd client && npx vite-node scripts/audit-rise-of-ix-cards.mts`.

## Scope

Audit of the **Rise of Ix imperium card effect definitions** against the
user-provided reference spreadsheet
(`client/src/data/Filtered Card Count ----> 136 5 cards av`), cross-checked
against the authored data (`client/src/data/cardsRiseOfIx.ts`) and the
published catalog (`client/public/catalogs/cards.v1.json` +
`effects.v1.json`). Promo rows in the spreadsheet are included.

## Artifacts

| File | Purpose |
|------|---------|
| `client/scripts/audit-rise-of-ix-cards.mts` | Re-runnable audit script (CSV ↔ code ↔ catalog). |
| `notes/rise-of-ix-card-audit.csv` | One row per card: qty, catalog id, presence, status, mismatches. |
| `notes/rise-of-ix-card-audit.json` | Full normalized records (CSV row, code card, catalog card + effects, expected effects). |

The script encodes the expected effect shapes (derived from the spreadsheet
and the rules FAQ) in `EXPECTED_EFFECTS`, so any future drift in
`cardsRiseOfIx.ts` or the catalog fails the audit.

## Result

```
Rise of Ix card audit — 33 cards
  OK:       29
  MISMATCH: 0
  MISSING:  4   (promo cards)
```

All 29 Rise of Ix cards match the reference on qty, cost, factions, agent
icons, infiltrate, unload, acquire, play and reveal effects, and the
published catalog matches the authored code.

## Findings and fixes

### 1. Negotiated Withdrawel — agent icon order (fixed)

The code had `[SPICE_TRADE, LANDSRAAD, CITY]`; the spreadsheet and the card
art (top-to-bottom: green, blue, yellow) are `[LANDSRAAD, CITY, SPICE_TRADE]`.
The plan's AC6 and the data test had encoded the wrong order.

- Fixed in `client/src/data/cardsRiseOfIx.ts`.
- Test updated in `cardsRiseOfIxData.test.ts`.
- Plan AC6/§3/§7 corrected in `plans/rise-of-ix/08-imperium-row-cards.md`.
- Catalog regenerated (`npm run generate:catalogs`).

### 2. Treachery — influence scope (fixed)

Treachery reads **"Gain two Influence instead of one. Trash this card."** —
identical to Power Play. The implementation granted **2 influence per faction
icon on the card** (up to 8 influence), which is inconsistent with Power Play
and with the rules FAQ:

- FAQ, Selective Breeding: "…the double bump from Power Play, and the double
  bump and troops from Treachery."
- FAQ, Power Play: "Power Play's Agent Box only works if you send an agent to
  a faction space."
- FAQ, Ghola: "When grafted to Power Play to send an Agent to a faction board
  space, you gain only 2 influence with that faction."

Fix: Treachery now uses the Power Play pending-reward model — the custom
reward stays pending, and claiming it marks the board-space influence reward
for +1 (2 instead of 1). If the influence was already claimed, claiming
Treachery grants +1 on the same faction (same as Power Play).

- `client/src/data/leaderAbilities/powerPlay.ts` — helpers generalized
  (`findBoardInfluenceTarget`, `resolveInfluenceDoublerOnPendingRewards`,
  `applyInfluenceDoublerBonusAfterInfluenceClaimed`,
  `hasUnclaimedInfluenceDoubler`) with Power Play / Treachery wrappers.
- `client/src/components/GameContext/GameContext.tsx` — Treachery play effect
  now enqueues a pending reward; `CLAIM_REWARD` handles it; `CLAIM_ALL_REWARDS`
  keeps the board influence pending while an influence doubler is unclaimed.
- `client/src/App.tsx` — Treachery stays manual in auto-apply (like Power Play).
- `client/src/components/GameContext/riseOfIxReducer.ts` — removed the old
  `applyTreacheryDoubleInfluence` helper.
- Tests updated in `riseOfIxImperium.test.ts` (unit + reducer integration).
- Plan §3/§8 corrected.

### 3. Catalog staleness (synced)

Regenerating the catalog surfaced pre-existing drift between code and the
committed JSON (not caused by this audit):

- Sietch Tabr `influence` removed from the catalog (code already had it
  removed in "Fix Sietch Tabr bug").
- A conflict's second-place reward order (Spice/Water) and the user's
  in-progress third-place Spice 1→3 change.

`npm run generate:catalogs` re-synced `cards`, `catalog`, `board-spaces` and
`conflicts` catalogs.

### 4. Promo cards missing (open)

Four promo cards from the spreadsheet are **not implemented** — no card data,
no catalog entries, and no card art in `client/public/imperium_row/`:

| Card | Qty | Cost | Faction | Icons | Agent box | Reveal |
|------|-----|------|---------|-------|-----------|--------|
| Boundless Ambition | 1 | 5 | – | EM, SG, BG, FR | Signet Ring | Acquire a card costing ≤5 (Unload) |
| Duncan Loyal Blade | 1 | 5 | – | FR, Bl | +1 troop | 1 persuasion, 2 swords; trash this → deploy/retreat any # troops |
| Jessica of Arrakis | 1 | 3 | BG | Yw | 2× draw if another BG in play | 1 persuasion, 2 swords |
| Thumper | 1 | 3 | FR | Yw | Double the bonus spice you harvest with this agent | 1 persuasion, 1 spice |

Expected shapes are recorded in the audit script/JSON. Adding them needs card
art plus handlers (Signet Ring resolution, deploy/retreat-any, bonus-spice
doubling) — recommended as a follow-up.

### 5. Imperial Bashar sword counting (fixed)

FAQ: "The Reveal box only counts other cards that actually provide swords this
turn. (For example: Bene Gesserit Sister is not counted if you choose to gain
2 Persuasion instead of 2 swords.)"

The original `cardProvidesSword` counted any revealed card with a printed
`combat` reward, so a Bene Gesserit Sister that chose persuasion still counted,
and conditional swords (e.g. Fedaykin Death Commando without the Fremen bond)
counted too.

Fix: reveal sword counters now read **resolved gains**, not printed icons.

- Imperial Bashar (`countOtherSwordCards`) counts other cards that produced a
  combat gain this turn — one sword is enough ("one or more"). The bonus is
  re-evaluated whenever a later gain lands, so reveal order no longer matters
  (a Bashar revealed before its sword cards used to stay at +2).
- Artillery (`cardProvidedSwords`) uses the same counting, and its count is
  re-evaluated as reveal choices resolve. The tile records
  `currTurn.artilleryFired`, so acquiring it mid-reveal (e.g. via Machine
  Culture) does not grant its Reveal effect retroactively.

## Verification

- `npx vite-node scripts/audit-rise-of-ix-cards.mts` → 29 OK / 0 mismatch /
  4 missing (promos).
- `npx vitest run` on the RoI, catalog, Power Play and Tessia suites → all
  pass.
- Full suite: 23 failures in 13 files, **identical on a pristine `HEAD`
  checkout** (pre-existing; e.g. `theVoice.test.ts` looks for The Voice in the
  starting deck, `saveRoundTrip.test.ts` hits `STARTING_DECK_IDS is not
  defined`).
