# Follow-up 01 — Unload (Reveal on discard / trash)

> **Gate:** `state.expansions.riseOfIx === true` only.
> Depends on [Task 02](../02-types-and-data-models.md) (`Card.unload`) and
> [Task 08](../08-imperium-row-cards.md) (card data).

---

## 1. Goal

Wire the **Unload** icon: when a card with `unload: true` is **discarded**
or **trashed** before its owner's Reveal turn, fire that card's
`revealEffect[]` the same way a normal Reveal turn would (logging gains
with an `(Unload)` suffix on the source name).

Normal Reveal turns are unchanged. Unload must not fire when `riseOfIx`
is false (ignore `unload` flag entirely).

---

## 2. Current state

- **Data:** `unload: true` on these RoI imperium cards in
  `client/src/data/cardsRiseOfIx.ts`:

  | Card | Qty in deck |
  |------|-------------|
  | CHOAM Delegate | 1 |
  | Esmar Tuek | 1 |
  | Freighter Fleet | 2 |
  | Guild Accord | 1 |
  | In the Shadows | 2 |
  | Ix-Guild Compact | 1 |
  | Treachery | 2 |
  | Water Peddler | 1 |

- **Catalog:** `unload` published on `CatalogCardEntry` (schema v2).
- **Missing:** `fireUnloadIfApplicable` (or equivalent) is **not** called
  from discard/trash paths in `GameContext.tsx` / `riseOfIxReducer.ts`.

---

## 3. Requirements

1. **R1 — Helper.** Add `fireUnloadIfApplicable(state, playerId, card, reason)`
   in `client/src/components/GameContext/riseOfIx/unload.ts` (or
   `riseOfIxReducer.ts`). Early-return if `!state.expansions.riseOfIx`
   or `!card.unload`.
2. **R2 — Trigger sites.** Call from every path that moves a card from
   hand → discard or hand/in-play → trash **before** the player's Reveal
   turn for that round, including:
   - Discard-as-cost (`CardSelectChoice` resolve)
   - Trash-as-cost (Guild Chief Administrator, Shai-Hulud, etc.)
   - Acquire trash, effect trash, manual trash if any
   - Do **not** double-fire on Reveal turn (Reveal path already runs
     `revealEffect`).
3. **R3 — Gains.** Reuse existing reveal-effect application; set gain
   source name to `` `${card.name} (Unload)` `` for time-travel diffs.
4. **R4 — History.** No new top-level action required if unload runs as
   part of an existing action (`CUSTOM_EFFECT`, `RESOLVE_CHOICE`, etc.);
   gains must appear on `state.gains` for the current turn.
5. **R5 — Sandbox.** Unload must work in committed sandbox games with
   RoI on (same reducer paths).

---

## 4. Files touched (expected)

| File | Change |
|------|--------|
| `client/src/components/GameContext/riseOfIx/unload.ts` | New helper |
| `client/src/components/GameContext/GameContext.tsx` | Hook discard/trash resolves |
| `client/src/components/GameContext/riseOfIxReducer.ts` | Delegate RoI unload if cleaner |
| `client/src/components/GameContext/__tests__/unload.test.ts` | New tests |

---

## 5. Acceptance criteria

1. **AC1** — RoI off: discarding a card never runs extra reveal effects.
2. **AC2** — RoI on: discarding **Water Peddler** from hand logs
   `+1 Water` from `(Unload)` before Reveal.
3. **AC3** — RoI on: **Freighter Fleet** discarded as cost enqueues
   freighter Advance/Recall choice from unload reveal.
4. **AC4** — Reveal turn still runs reveal effects once (no duplicate).
5. **AC5** — `UNDO_TO_TURN` restores state without orphan unload gains.

---

## 6. Unit tests

**Path:** `client/src/components/GameContext/__tests__/unload.test.ts`

- [ ] `no unload when riseOfIx false`
- [ ] `discard Water Peddler triggers unload water gain`
- [ ] `unload Freighter Fleet enqueues freighter choice`
- [ ] `no unload on reveal turn for same card`

---

## 7. Notes

- See [Task 08 §5.3](../08-imperium-row-cards.md) for the original design.
- `CustomEffect.UNLOAD_REVEAL` exists in types but prefer the
  `card.unload` boolean as the single source of truth.
