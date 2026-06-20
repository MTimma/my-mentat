# Imperium cards & Unload

29 **unique** Rise of Ix imperium cards (35 printings with duplicates) in `RISE_OF_IX_IMPERIUM_DECK`.

## Data tests (`cardsRiseOfIxData.test.ts`)

| ID | Assertion |
|----|-----------|
| IR-01 | `RISE_OF_IX_UNIQUE_CARD_COUNT === 29` |
| IR-02 | Deck length 35 |
| IR-03 | Every card `riseOfIx: true` and image under `imperium_row/rise_of_ix/` |
| IR-04 | Spot checks: Appropriate (unload), Negotiated Withdrawel, In the Shadows, Guild Chief Administrator |

## Unload mechanic (`unload.test.ts`)

When `riseOfIx` is on, **Unload** icons on revealed cards fire when the card is **discarded or trashed** (not when cleaned up from play area without discard).

| ID | Assertion |
|----|-----------|
| UL-01 | No unload when `riseOfIx` false |
| UL-02 | Discard via Ixian Probe triggers unload on discarded card |
| UL-03 | Trash path triggers unload |
| UL-04 | Card-specific unload rewards applied (see test for seeded card names) |

Reducer: `client/src/components/GameContext/riseOfIx/unload.ts`.

## Per-card behavior

Full imperium matrix: **todo** — mirror base `imperiumRowCards.test.ts` pattern with `it.todo` per unique RoI name.

Priority cards (custom effects / RoI-specific):

| Card | Mechanic | Status |
|------|----------|--------|
| Appropriate | Unload on discard | data ✓, reducer partial |
| Cards with `acquireTech`, `dreadnoughts`, `freighter` | RoI rewards | todo per card |
| Cards with `discard` cost | Hand choice | todo |
| Guild Chief Administrator | SG-specific | data smoke ✓ |

## Deck builder

`buildImperiumDeck.test.ts` — combined deck length/uniqueness with RoI flag.

## Agent checklist

1. Add card to `cardsRiseOfIx.ts`.
2. Regenerate catalogs if using v2 JSON.
3. Add `it` or `it.todo` with printed Agent/Reveal text.
4. If card has Unload, extend `unload.test.ts`.

## UI scenarios

[10-ui-regression.md](./10-ui-regression.md) **UI-CARD-*** (reveal + discard unload).
