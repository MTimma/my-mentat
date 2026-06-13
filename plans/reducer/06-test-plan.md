# 06 — Reducer Test Plan (pre-port safety net)

Goal: pin down **all expected reducer functionality in TS tests before the
Rust port**, so the port is verified by (a) ported unit tests and (b) golden
event logs replayed by both engines with identical results.

## 1. Current coverage snapshot (2026-06-10)

Existing suites: `baseGameManifest`, `boardSpaceCostGains`, `boardSpaces`,
`combatRewardDuplication`, `conflictsBase`, `deckDrawRewards`,
`imperiumRowCards`, `intrigueCards`, `roundStructure`, `sandboxSetup`,
`shiftingAllegiances`, `theVoice`, `undoTurnGains` (+ utils suites).

Action-level usage in tests (grep of `type: '...'` in `__tests__/`):

| Reducer case | Uses in tests | Status |
|---|---|---|
| PLAY_INTRIGUE / PLAY_CARD / PLACE_AGENT | 27 / 24 / 23 | good |
| PLAY_COMBAT_INTRIGUE / DEPLOY_TROOP / RESOLVE_COMBAT / CLAIM_REWARD | 11–12 | good |
| RESOLVE_CHOICE | 9 | ok (rewrite for `optionIndex`, see `02`) |
| SANDBOX_* | 2–6 | ok |
| CLAIM_ALL_REWARDS | 5 | thin |
| UNDEPLOY_TROOP / SELECT_CONFLICT / PAY_COST | 3 | thin |
| RETREAT_TROOP / PASS_COMBAT / REVEAL_CARDS / END_TURN / ACQUIRE_SMF / UNDO_TO_TURN / UNDO_TO_SETUP | 2 | thin |
| START_COMBAT_PHASE / RESOLVE_ENDGAME / RESOLVE_CONFLICT_REWARD_CHOICE / MOBILIZE_GARRISON / ACQUIRE_CARD | 1 | thin |
| **ACQUIRE_AL** | 0 | **missing** |
| **TRASH_CARD** | 0 | **missing** |
| **RESOLVE_CARD_SELECT** | 0 | **missing** |
| **RESET_IMPERIUM_ROW** | 0 | **missing** |
| **SELECT_IMPERIUM_REPLACEMENT** | 0 | **missing** |
| **OPPONENT_DISCARD_CHOICE / _CARD / _CARDS / _NO_CARD_ACK** | 0 | **missing** |
| **CUSTOM_EFFECT** (directly) | 0 | indirect only via intrigue/leader tests |

## 2. New unit-test files (TS, written against current reducer)

Conventions: use `__tests__/_helpers.ts` builders; every test asserts the
*full relevant slice* of state (piles, resources, gains, pendingX), not just
the headline value — these assertions become the Rust port's spec.

### `revealTurn.test.ts` (priority 1 — reveal is the least-tested core flow)
- [ ] REVEAL_CARDS: persuasion + swords totals; combatStrength only if troops
      in conflict; revealed ids recorded; hand emptied into play area.
- [ ] ACQUIRE_CARD: persuasion deducted, card → discard, row gap +
      `pendingImperiumRowReplacement` set; `freeAcquire`; `acquireToTop`
      (intrigue modifier) puts card on deck top; acquire-effect rewards fire.
- [ ] ACQUIRE_AL / ACQUIRE_SMF: reserve decks decrement; SMF VP; Guild
      Bankers `smfDiscount`; cannot acquire when persuasion insufficient.
- [ ] SELECT_IMPERIUM_REPLACEMENT / RESET_IMPERIUM_ROW: row always ends at 5;
      replacement consumes pending marker; reset replaces all unsold cards.
- [ ] END_TURN after reveal: cards (agent + reveal) → discard pile; persuasion
      zeroed; player marked revealed; turns skipped thereafter.

### `endTurnGating.test.ts` (priority 1 — encodes C001–C003 from `03`)
- [ ] END_TURN blocked while mandatory `pendingChoices` exist (OR choice,
      influence choose/lose, card-select).
- [ ] END_TURN allowed with unresolved `optionalEffects` (cost-reward lapses).
- [ ] END_TURN allowed with unclaimed optional trash reward; blocked /
      consistent for `trashThisCard` cost of a used effect (self-trash).
- [ ] END_TURN advances to next non-revealed player; round phase change when
      all revealed.

### `trashCard.test.ts` (priority 1)
- [ ] TRASH_CARD from hand / discard / play area; `handCount` fix when from
      hand; card lands in `trash`; `gainReward` applied with attribution.
- [ ] RESOLVE_CARD_SELECT for trash-selection choices (today: 0 coverage —
      cover Other Memory and Helena flows which resolve through it).

### `opponentDiscard.test.ts` (priority 1 — whole flow untested)
- [ ] Mohiam / Test of Humanity: OPPONENT_DISCARD_CHOICE (discard vs lose
      troop), OPPONENT_DISCARD_CARD(S) updates piles + counts,
      OPPONENT_NO_CARD_ACK skips empty-handed opponent, flow completes and
      restores `currTurn` / `canEndTurn`.

### `combatPhase.test.ts` (priority 2 — consolidate thin spots)
- [ ] START_COMBAT_PHASE ordering from first player; PASS_COMBAT consecutive-
      pass resolution trigger; re-entry after non-consecutive passes.
- [ ] RETREAT_TROOP limits (`removableTroops`, `effectRetreatAllowance`);
      MOBILIZE_GARRISON cap (recruited-this-turn + 2 from garrison).
- [ ] RESOLVE_COMBAT: tie rules (tie for 1st → both get 2nd reward; tie for
      2nd → both get 3rd; 4p third reward); 0-strength gets nothing; control
      marker placement; troops → supply; markers reset.
- [ ] RESOLVE_CONFLICT_REWARD_CHOICE: every pending choice must resolve before
      next round; deferred mentat handover (`combatResolutionDeferred`).

### `customEffects.test.ts` (priority 2)
- [ ] Direct CUSTOM_EFFECT dispatch per `CustomEffect` variant not already
      covered via intrigue/leader suites (audit & list at implementation
      time); at minimum: KWISATZ_HADERACH, SHUFFLE_DISCARD_INTO_DECK
      (deterministic concatenation order!), SELECTIVE_BREEDING data path,
      SECRETS_STEAL eligibility gating.

### `undoAndBranch.test.ts` (priority 2 — extends `undoTurnGains`)
- [ ] UNDO_TO_TURN restores full state slice (piles, influence, occupied
      spaces, combat troops) at round-start, mid-round, and combat snapshots.
- [ ] UNDO_TO_SETUP → setupBaseline equivalence.

### `idDeterminism.test.ts` (lands with `02`)
- [ ] Semantic id grammar + occurrence scoping; two identical effects in one
      turn get `-0` / `-1`; ids stable across replays.
- [ ] RESOLVE_CHOICE by `optionIndex`: out-of-range and disabled rejected.

## 3. Golden event logs (the differential bridge to Rust)

- [ ] `test-fixtures/golden/` — scripted full games as save docs (`01`
      format), each with the expected **final state** and **per-END_TURN
      checksums** committed alongside:
      - `golden-01-basic.json` — 2p, agent+reveal turns, one combat, no
        intrigue.
      - `golden-02-choices.json` — OR choices, influence choose/lose,
        card-select, optional effects lapsing, trash flows.
      - `golden-03-intrigue.json` — plot/combat/endgame intrigue, opponent
        discard, The Voice, infiltrate.
      - `golden-04-fullgame.json` — 10 rounds to endgame + tiebreakers.
      - `golden-05-sandbox-debug.json` — sandbox setup + DEBUG_PATCH events.
- [ ] TS runner: replay each golden log, assert checksums + final state.
- [ ] Rust runner (in `04` step order): same logs, byte-identical normalized
      state JSON. A canonical normalization (sorted keys, sets as sorted
      arrays) is defined once and shared.
- [ ] Property test (Rust `proptest` / TS fast-check): replaying any prefix of
      a golden log twice yields identical states (determinism invariant).

## 4. Runtime self-verification (recording mode)

- [ ] Dev/recording feature: after each END_TURN, background-replay the log
      from genesis and deep-compare with live state; on mismatch surface the
      turn number + first differing path. Catches (a) any component mutating
      state outside dispatch, (b) any nondeterminism regression — permanently.
- [ ] Ship enabled in dev builds; toggleable in prod (cheap: a full replay is
      ms).

## 5. Sequencing

1. §2 priority-1 files (reveal, gating, trash, opponent-discard) — these are
   the holes that would silently mis-port.
2. `02` id changes + `idDeterminism.test.ts` + rewrite of `RESOLVE_CHOICE`
   call sites in existing tests.
3. Golden logs 01–03 (04–05 after sandbox/debug events exist).
4. §4 self-verification.
5. Rust port proceeds per `04` §6, gated on the corresponding golden logs.
