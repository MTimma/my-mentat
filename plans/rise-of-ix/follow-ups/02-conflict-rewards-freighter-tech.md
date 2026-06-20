# Follow-up 02 — Conflict rewards: FREIGHTER & TECH

> **Gate:** `state.expansions.riseOfIx === true` only.
> Depends on [Task 05](../05-freighter-shipping-track.md),
> [Task 06](../06-tech-tiles.md), [Task 10](../10-conflict-cards.md).

---

## 1. Goal

When combat resolves, **RoI conflict cards** that award `RewardType.FREIGHTER`
or `RewardType.TECH` must apply the same semantics as board-space /
card rewards — not be silently skipped.

Base-game conflict rewards (solari, spice, troops, VP, intrigue) are
unchanged. New handlers run only when RoI is enabled **and** the active
conflict id is in `RISE_OF_IX_CONFLICTS` (919–922).

---

## 2. Current state

- **Data** (`client/src/data/conflictsRiseOfIx.ts`):

  | ID | Name | FREIGHTER / TECH rewards |
  |----|------|--------------------------|
  | 919 | Skirmish IV | 1st: FREIGHTER×1 + troops |
  | 920 | Skirmish V | 1st: FREIGHTER×1 + spice |
  | 921 | Economy Supremacy | 1st choice includes TECH×1 |
  | 922 | Trade Monopoly | 1st: FREIGHTER×2 + troops |

- **Gap:** `RESOLVE_COMBAT` / `applyConflictReward` path handles standard
  `RewardType` values but does not expand FREIGHTER into Advance/Recall
  choices or TECH into `acquireTech` / `ACQUIRE_TECH` flow.

---

## 3. Requirements

1. **R1 — FREIGHTER.** On conflict reward grant, when
   `reward.type === RewardType.FREIGHTER` and `riseOfIx`:
   - Call `pushFreighterChoicesFromReward` (from `riseOfIx/freighter.ts`)
     `amount` times per reward row.
   - Log `RewardType.FREIGHTER` gains when choices resolve (reuse
     existing freighter custom effects).
2. **R2 — TECH.** When `reward.type === RewardType.TECH`:
   - Enqueue `acquireTech: { discount: 0 }` (or open TechStacksModal
     prompt) via existing `pendingRewards` / `CLAIM_REWARD` path.
   - If `ixBoard` has no face-up tiles, log skip row (same as shipping
     track step 3).
3. **R3 — Choice rewards.** Economy Supremacy 1st-place OR branch with
   TECH option must use the same TECH handler as R2.
4. **R4 — Placement order.** Freighter choices from conflict rewards
   enqueue **after** immediate resources (troops/spice) on the same
   placement, matching how card rewards interleave with `pendingChoices`.
5. **R5 — History.** Freighter/tech conflict payouts replay through
   existing `RESOLVE_CHOICE` / `ACQUIRE_TECH` events — verify
   `buildHistoryFromEvents` round-trips.
6. **R6 — Sandbox.** `SANDBOX_SET_CONFLICT` with id 919–922 only when
   RoI on (already gated); reward resolution must work post-commit.

---

## 4. Files touched (expected)

| File | Change |
|------|--------|
| `client/src/components/GameContext/GameContext.tsx` | Conflict reward application |
| `client/src/components/GameContext/riseOfIx/conflictRewards.ts` | New pure helpers |
| `client/src/components/GameContext/riseOfIx/freighter.ts` | Export shared enqueue |
| `client/src/components/GameContext/__tests__/conflictRewards.test.ts` | New (plan 10 §6) |

---

## 5. Acceptance criteria

1. **AC1** — RoI off: winning base conflicts unchanged.
2. **AC2** — RoI on, Skirmish IV 1st: troops applied + one freighter
   Advance/Recall choice pending.
3. **AC3** — RoI on, Trade Monopoly 1st: two freighter choices.
4. **AC4** — RoI on, Economy Supremacy TECH choice opens acquire flow.
5. **AC5** — Empty ix board: TECH reward logs skip, no crash.

---

## 6. Unit tests

**Path:** `client/src/components/GameContext/__tests__/conflictRewards.test.ts`

- [ ] `Skirmish IV first place grants troops and freighter choice`
- [ ] `Trade Monopoly first place grants two freighter choices`
- [ ] `Economy Supremacy TECH choice enqueues acquireTech`
- [ ] `no freighter/tech handlers when riseOfIx false`

---

## 7. Notes

- Conflict `FREIGHTER` uses `{ type, amount }` on `ConflictReward`;
  board spaces use `reward.freighter` on `Reward` — keep both mapped to
  the same freighter module.
- See [Task 10 §7](../10-conflict-cards.md) — this file was flagged
  during Task 10 implementation.
