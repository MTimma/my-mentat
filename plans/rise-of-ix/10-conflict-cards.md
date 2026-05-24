# Task 10 — Rise of Ix conflict cards & deck composition

> Depends on Tasks 01, 02 (RewardType.TECH, RewardType.DREADNOUGHT).
> Conflict cards are pure declarative data plus a small change to the
> conflict pool helper.

---

## 1. Goal

Add the 4 new conflict cards and adjust the tier mix when
`expansions.riseOfIx === true`.

Assets present in `client/public/conflicts/cards/rise_of_ix/`:

- `skirmish-iv.png`
- `skirmish-v.png`
- `economy_supremacy.png`
- `trade_monopoly.png`

Per rulebook: "**2 Conflict I + 1 Conflict II + 1 Conflict III**" of
new cards. Together with base (4 × I + 8 × II + 4 × III = 16) the
total becomes **6 × I + 9 × II + 5 × III = 20**.

> Reference: base game uses **18 unique** conflicts in our code (see
> `client/src/data/conflicts.ts`); rulebook says base has 16. Our 2
> extra base cards (variants) appear to be added by previous work
> (see [`conflicts.ts`](../../client/src/data/conflicts.ts)). Treat
> them as base and keep them in the RoI pool — they don't break
> anything.

---

## 2. Requirements

1. **R1 — Cards.** Add 4 entries in
   `client/src/data/conflictsRiseOfIx.ts` (new file).
2. **R2 — Pool helper.** `getConflictPool(expansions)` (Task 01 R7)
   returns base ⨁ RoI when on.
3. **R3 — Tier mix per draw.** When `expansions.riseOfIx === true`,
   the **per-round tier sequence** is updated:
   - Round 1: **1 Conflict I** (chosen from the pool, then discarded).
   - Rounds 2–6: **5 Conflict II** total.
   - Rounds 7–10: **4 Conflict III** total.
   This matches the existing `ConflictSelect` tier filter — just the
   pool size grows.
4. **R4 — Rewards typing.** The new cards use existing
   `RewardType.*` values; if a conflict awards a **dreadnought** or a
   **tech tile**, use the new types (`DREADNOUGHT`, `TECH`).

---

## 3. Per-card design

> Card text is paraphrased; printed wording on the physical cards
> takes precedence.freigh

### 3.1 `skirmish-iv.png` — "Skirmish IV"

- **Tier 1**.
- **Suggested rewards (verify on card):**
  - 1st: `freighter/shipping: 1, troops: 1` 
  - 2nd: `spice: 2`
  - 3rd: `spice: 1`

- **Tier 1**.
### 3.2 `skirmish-v.png` — "Skirmish V"
 - 1st: `freighter/shipping: 1, spice: 1` 
  - 2nd: `solari: 3`
  - 3rd: `solari: 2`


### 3.3 `economy_supremacy.png` — "Economy Supremacy"

- **Tier 2**.
- Typical rewards format (placeholder until printed values are
  confirmed):
  - 1st: `victoryPoints: 1, victorypoints: 1 (price: 6 solari), victorypoints 1 (price 4 spice)` *or* `acquireTech: { discount: 1 }`.
  - 2nd: `victory points: 1`.
  - 3rd: `spice: 2, solari: 2`.

### 3.4 `trade_monopoly.png` — "Trade Monopoly"

- **Tier 2** 
- Typical rewards:
  - 1st: `freighter/shipping: 2, troops: 1` 
  - 2nd: `intrigue: 1, water: 1`
  - 3rd: `intrigue: 1 OR water: 1`


---

## 4. Files touched

| File | Change |
|---|---|
| `client/src/data/conflictsRiseOfIx.ts` (new) | The 4 new conflicts. |
| `client/src/data/conflicts.ts` | Add `getConflictPool(expansions)` + `RISE_OF_IX_CONFLICTS` re-export. |
| `client/src/components/ConflictSelect/ConflictSelect.tsx` | No code change expected; it already filters by tier. Visual: surface the conflict image from the rise_of_ix folder. |
| `client/src/data/boardMarkerAnchors.ts` | Existing `conflictCardImageSrc(id)` should map RoI conflict ids to `/conflicts/cards/rise_of_ix/<slug>.webp` (we have `.png` here — adjust the file extension check). |

---

## 5. Detailed design

### 5.1 ID allocation

Existing conflicts use ids `901..918`. Allocate ids `919..922` for
the 4 new cards (one per asset).

### 5.2 `conflictCardImageSrc(id)`

Patch to first check a RoI ID range and prepend the right path:

```ts
export function conflictCardImageSrc(id: number): string | null {
  if (id >= 919 && id <= 922) return `/conflicts/cards/rise_of_ix/${ROI_SLUG[id]}.png`
  // ...existing base mapping
}
```

`ROI_SLUG` maps each id to its asset slug:

```ts
const ROI_SLUG: Record<number, string> = {
  919: 'skirmish-iv',
  920: 'skirmish-v',
  921: 'economy_supremacy',
  922: 'trade_monopoly',
}
```

### 5.3 Pool helper

```ts
export function getConflictPool(expansions: Expansions): ConflictCard[] {
  return expansions.riseOfIx
    ? [...CONFLICTS, ...RISE_OF_IX_CONFLICTS]
    : CONFLICTS
}
```

Replace direct imports of `CONFLICTS` in `App.tsx` and elsewhere with
`getConflictPool(gameState.expansions)`.

---

## 6. Acceptance criteria

1. **AC1** — `getConflictPool({ riseOfIx: false }).length === CONFLICTS.length`.
2. **AC2** — `getConflictPool({ riseOfIx: true }).length === CONFLICTS.length + 4`.
3. **AC3** — Each of the 4 new conflict ids points to a non-null image
   URL under `/conflicts/cards/rise_of_ix/`.
4. **AC4** — `ConflictSelect` shows the new cards in the correct tier
   bucket per round.
5. **AC5** — Reward types `DREADNOUGHT` and `TECH` on a conflict
   produce correct gain rows when awarded (no crash for unknown
   types).

---

## 7. Unit tests

**Path:** `client/src/data/__tests__/conflictsRiseOfIx.test.ts` (new)

- [ ] `4 entries`
- [ ] `each entry has a tier in {1, 2, 3}`
- [ ] `every entry's id is in 919..922 and unique`
- [ ] `conflictCardImageSrc returns a /rise_of_ix path for ids 919..922`

**Path:** `client/src/components/GameContext/__tests__/conflictRewards.test.ts` (extend existing or new)

- [ ] `awarding RewardType.DREADNOUGHT increments player.dreadnoughts.garrison`
- [ ] `awarding RewardType.TECH enqueues an ACQUIRE_TECH choice for the winner`
- [ ] `freighter/shipping allows respective player to choose what to do - go up or down on the shipping board`

---

