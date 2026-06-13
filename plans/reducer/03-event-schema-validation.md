# 03 — Event Schema & Validation

Two validation layers. Both live in the engine (Rust crate, `04`) and are
exposed to the browser via WASM and to external producers via the API (`05`).

## 1. Layer A — structural (per event, stateless)

Schema for the save document and every event variant:

- Rust: serde enums with `#[serde(tag = "type")]` + `deny_unknown_fields` —
  malformed events fail at parse time with positions.
- A JSON Schema is **generated from the Rust types** (`schemars`) and published
  at the API (`/v1/schema/save-doc.json`) so external apps/CLI validate without
  running the engine.
- TS side validates with the same generated JSON Schema (single source of
  truth; no hand-written zod duplicate).

Checks: known `type`, required fields per variant, value domains
(`playerId` ∈ setup players, ids are positive ints, `color` enum,
`optionIndex >= 0`), catalog references exist (card/space/conflict/leader ids
present in the published catalogs for the doc's `schemaVersion` +
`expansions`).

## 2. Layer B — semantic (replay-time, stateful)

Validation **is** replay: fold events through `reduce`, but in strict mode the
engine returns typed errors instead of the silent `return state` the TS
reducer does today. Every silent-ignore branch becomes a named rule.

### Rule catalog (initial)

Legality:

- `E001` actor must be the active player (except phase-free actions:
  combat intrigue, opponent-discard responses, …).
- `E002` action not legal in current phase (e.g. `PLAY_CARD` during combat).
- `E003` referenced card not in the expected pile (hand / imperium row /
  intrigue hand…).
- `E004` board space occupied / blocked (The Voice) / influence requirement
  not met / cost not affordable.
- `E005` `choiceId` not pending (wrong id or already resolved).
- `E006` `optionIndex` out of range or option `disabled`.
- `E007` `effectId` (PAY_COST) not in `optionalEffects`.
- `E008` troop ops exceed limits (`troopLimit`, `removableTroops`,
  garrison/supply counts).

Completeness — checked when a turn/phase closes (the rules the user named):

- `C001` **Mandatory choices**: `END_TURN` is invalid while the acting
  player's `pendingChoices` (OR-choices, influence choose/lose, card-select)
  or mandatory `pendingRewards` remain. Mirrors `canEndTurn`; the validator
  must reuse the reducer's own gating, not reimplement it.
- `C002` **Optional cost-rewards may lapse**: unresolved `optionalEffects`
  (pay-cost-for-effect) at `END_TURN` are legal — they expire silently.
- `C003` **Trash is optional, except self-trash**: a pending trash *reward*
  (`isTrash`, e.g. "you may trash a card") may lapse at `END_TURN`; but a
  `trashThisCard` that is the **cost side of an effect the log claims was
  used** must have occurred (the card must be in `trash`, not in
  `playArea`/`discard`). Self-trash is never auto-skippable.
- `C004` combat phase closes only after all involved players passed
  consecutively or `RESOLVE_COMBAT`; `RESOLVE_CONFLICT_REWARD_CHOICE` required
  for every entry in `pendingConflictRewardChoices` before next round starts.
- `C005` reveal turn: `REVEAL_CARDS` ids ⊆ hand; acquisitions ≤ persuasion
  (with discounts); `RESET_IMPERIUM_ROW` / `SELECT_IMPERIUM_REPLACEMENT`
  consistency (row must always end at 5).

Divergence:

- `D001` `ck` checksum mismatch on `END_TURN` → "replayed state diverges from
  recorded state at event N (turn T, player P)". Warning for analysis mode,
  error for import.

### Strictness modes

| Mode | Use | Behavior |
|---|---|---|
| `strict` | API import, CLI validate | any E/C rule ⇒ reject with event index + rule id |
| `record` | live in-app logging | E rules can't occur (UI prevents); C rules enforced by existing `canEndTurn` |
| `lenient` | opening old saves after engine fixes | E/C ⇒ collect & report, attempt continue; D001 ⇒ report only |

### `DEBUG_PATCH` validation

- Whitelisted paths only (player resources, vp, troops, influence, deck/pile
  membership moves, garrison/conflict troops, control markers, bonus spice).
- Values within domain (non-negative, influence 0–6, etc.).
- Patches to derived fields (`combatStrength`, `canEndTurn`, …) are rejected —
  the reducer recomputes those.

## 3. Error reporting shape

```jsonc
{
  "valid": false,
  "errors": [
    { "rule": "E005", "event": 57, "branch": "trunk",
      "message": "RESOLVE_CHOICE: choiceId card-12-OR not pending",
      "context": { "pending": ["card-31-TRASH"] } }
  ],
  "warnings": [ { "rule": "D001", "event": 88, ... } ]
}
```

Stable rule ids → UI can deep-link the offending turn in `TurnHistory`; CLI
exits non-zero with the list.

## 4. Tasks

- [ ] Inventory every silent `return state` guard in the TS reducer and map
      each to a rule id (this doubles as the spec for the Rust port's error
      enum — see `04`).
- [ ] Confirm `C001`–`C003` exactly against current `canEndTurn` /
      `pendingRewards` gating; document any mismatch between the rulebook and
      reducer behavior before encoding it.
- [ ] Implement serde types + `schemars` JSON Schema generation.
- [ ] Implement `validate(doc) -> ValidationReport` (replay in strict mode).
- [ ] Wire into: file import in the app (WASM), `POST /v1/games:validate`
      (API), `mentat validate <file>` (CLI).
- [ ] Fixture suite: one minimal invalid doc per rule id; one valid golden doc
      exercising all completeness rules.
