# 02 — Deterministic Semantic IDs & Decision Events

Smallest prerequisite for everything else. Two changes to the reducer's action
contract:

1. Pending choice / reward ids become **deterministic and semantic** (no
   `crypto.randomUUID()` inside the reducer or its helpers).
2. Resolution events carry **decisions (`optionIndex`), not outcomes
   (`Reward` payloads)**.

## 1. Why

- The reducer currently mints random ids at ~17 sites in
  `GameContext.tsx` plus `utils/influenceChoices.ts`, `data/leaderAbilities.ts`,
  `data/signetRingEffects.ts`, `data/leaderAbilities/memnonHighCouncilInfluence.ts`.
  Recorded `RESOLVE_CHOICE { choiceId }`, `RESOLVE_CARD_SELECT { choiceId }`,
  `CLAIM_REWARD { rewardId }`, `PAY_COST { effect.id }` then dangle on replay
  (the lookups `find(c => c.id === ...)` miss and the case silently
  `return state`).
- A **global** sequence counter would fix determinism but breaks two goals:
  external producers (CLI/API) would need full simulation to predict ids, and
  any reducer fix that adds/removes one pending item would shift every later id
  in old logs.
- Semantic ids are computable by an external producer ("the OR choice from
  card 12") and only change when the semantics of *that* choice change.

## 2. ID grammar (published as part of the API contract, see `05`)

```
<sourceType>-<sourceId>-<kind>[-<occurrence>]

sourceType  := card | board-space | intrigue | conflict | leader | high-council | mentat | ...
               (existing GainSource values, kebab-case)
sourceId    := numeric catalog id (card template id, space id, conflict id…)
kind        := OR | INFLUENCE-CHOOSE | INFLUENCE-LOSE | ACQUIRE | TRASH |
               CARD-SELECT | SIGNET | MASTERSTROKE | CONFLICT-REWARD | EFFECT | ...
occurrence  := 0-based counter, scoped to (source, kind, current turn)
               — omitted when 0
```

Examples: `card-12-OR`, `board-space-7-INFLUENCE-CHOOSE`,
`card-31-TRASH-1` (second trash choice from card 31 this turn),
`conflict-9-CONFLICT-REWARD-first-2`.

Rules:

- Use `card.id`, never `card.name` (names are not ids; current code mixes
  `card.name + '-OR-' + uuid`).
- The `occurrence` counter is **per (source, kind) within the current turn**,
  derived by counting existing entries in `pendingChoices` / `pendingRewards` /
  `optionalEffects` at creation time — no new state field needed, fully
  deterministic, and unrelated reducer changes don't shift it.
- `pendingConflictRewardChoices` ids include placement (`first|second|third`)
  and player id (they exist outside a turn).

## 3. Decision events (`optionIndex`)

Change:

```ts
// before
| { type: 'RESOLVE_CHOICE'; playerId; choiceId; reward: Reward; source?: {...} }
| { type: 'RESOLVE_CONFLICT_REWARD_CHOICE'; choiceId: string; reward: Reward }

// after
| { type: 'RESOLVE_CHOICE'; playerId; choiceId: string; optionIndex: number }
| { type: 'RESOLVE_CONFLICT_REWARD_CHOICE'; choiceId: string; optionIndex: number }
```

- Reducer resolves `options[optionIndex]` from the live `FixedOptionsChoice` /
  conflict-reward choice. Out-of-range or disabled option ⇒ reject (replay
  validation error), not a silent fallback.
- `RESOLVE_CARD_SELECT { choiceId, cardIds }` already records a decision —
  keep, just with the new ids.
- `PAY_COST { effect: OptionalEffect }` currently ships the whole effect
  (cost + reward). Replace with `{ type: 'PAY_COST', playerId, effectId }`;
  the reducer looks up the live `optionalEffects` entry. Keeps rule data out
  of the log (reducer-fix policy) and fixes the stale-id filter at
  `GameContext.tsx:3893`.
- `CLAIM_REWARD { rewardId, customData? }` — keep shape; `customData` stays
  (it is a decision: which space for The Voice, which card trashed, etc.).
- `RESOLVE_CHOICE.source` attribution param becomes unnecessary (derivable
  from the choice id) — drop it.

## 4. Implementation tasks

- [ ] Add `makeChoiceId(source, kind, state)` / `makeRewardId(...)` helpers in
      a pure module; unit-test the occurrence scoping.
- [ ] Replace all `crypto.randomUUID()` uses in reducer paths (grep list in
      §1) with the helpers. `polyfills/cryptoRandomUUID.ts` remains for
      non-reducer UI uses only (e.g. `meta.id` of a save doc).
- [ ] Convert `RESOLVE_CHOICE` / `RESOLVE_CONFLICT_REWARD_CHOICE` to
      `optionIndex`; update all dispatch sites (UI passes the index it already
      knows from rendering the options).
- [ ] Convert `PAY_COST` to `effectId`.
- [ ] Drop dead `DRAW_INTRIGUE` action.
- [ ] Tighten `CustomEffectData`: replace `[key: string]: unknown` with a
      closed union of the audited fields (`cardId`, `imperiumRowCardId`,
      `gainSource`, `trashedCardId`, `spaceId`, `targetPlayerId`, …) so
      non-serializable payloads become type errors.
- [ ] `PLAY_CARD.deckIndex`: keep as optional hint (reducer already falls back
      to `findIndex` by `cardId`, `GameContext.tsx:2659`); document that
      duplicate-template copies are value-identical so either resolution
      replays equivalently. No instance-id migration in this phase.
- [ ] Update existing tests that assert on id formats / pass `reward` payloads
      to `RESOLVE_CHOICE`.

## 5. Acceptance

- [ ] Replay determinism test: script a game exercising OR choices, influence
      choices, card-select, optional effects, conflict-reward choices; record
      the action log; replay from setup; final states deep-equal.
- [ ] Same test passes when run twice in one process and across processes
      (no hidden global counters).
- [ ] Grep gate in CI: `crypto.randomUUID|Math.random` forbidden under the
      reducer module(s).
