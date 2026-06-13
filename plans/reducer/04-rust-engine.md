# 04 — Rust Engine

Port the game reducer to a pure Rust crate compiled to **WASM (browser,
primary engine)** and **native (axum server + CLI)**. The TS reducer remains
the reference implementation until differential tests (`06`) pass, then it is
deleted.

## 1. Decision summary (vs Node)

- Single-replay performance is a non-goal (Node already does ~500 events in
  ms). Rust pays off in: bulk analytics / what-if search (10–50×, plus rayon),
  exhaustive enum matching for a closed rules domain, and one engine for
  browser + server + CLI.
- The reducer is already a pure `(state, action) -> state` function over plain
  data — the best possible shape for a first serious Rust project: almost
  entirely owned data, no lifetimes gymnastics, no async in the core.
- Main risk is behavioral drift while porting ~5k lines of subtle logic →
  mitigated by writing the missing TS tests *first* (`06`) and golden-log
  differential testing.

## 2. Workspace layout

```
engine/
  Cargo.toml                 # workspace
  crates/
    mentat-engine/           # pure: types, reduce(), validate(), ids, summary
    mentat-catalog/          # card/space/conflict/leader data (generated, see §5)
    mentat-wasm/             # wasm-bindgen wrapper around mentat-engine
    mentat-cli/              # validate / replay / stats / export commands
    mentat-server/           # axum API (see 05)
```

`mentat-engine` has **no** tokio/axum/wasm deps — only `serde`, `schemars`,
`thiserror`. Everything I/O-ish lives in the wrapper crates.

## 3. Type mapping (TS → Rust)

| TS | Rust |
|---|---|
| `GameAction` union | `enum Action { EndTurn { player_id: PlayerId }, … }` with `#[serde(tag = "type", rename_all = "SCREAMING_SNAKE_CASE")]` matching the existing wire names |
| `GameState` | `struct GameState` — but **without** `history`, `setupBaseline`, `selectedCard`, `canEndTurn`, `canAcquireIR`, `gains` UI-isms. Derived flags become methods (`state.can_end_turn()`); the gains log becomes an explicit replay output (`Vec<Gain>` emitted per reduce call) |
| `Set<number>` | `BTreeSet<PlayerId>` (ordered ⇒ deterministic serialization) |
| `Record<number, …>` | `BTreeMap<PlayerId, …>` |
| `CardSelectChoice.onResolve` closure | data: `enum CardSelectKind { OtherMemory, HelenaSignet, … }` — resolution dispatches on the kind. (Closures-in-state disappear entirely.) |
| `Leader` class | `LeaderId` newtype + catalog lookup |
| silent `return state` guards | `fn reduce(state, action) -> Result<Outcome, RuleError>` where `RuleError` carries the rule ids from `03` |
| `Card` objects in piles | `CardInstance { template: CardId }` referencing `mentat-catalog`; piles are `Vec<CardInstance>` |

Newtypes everywhere: `CardId(u32)`, `SpaceId(u16)`, `PlayerId(u8)`,
`ConflictId(u16)` — the compiler then catches the id-mixups that TS lets
through.

```rust
pub fn reduce(state: &GameState, action: &Action, cat: &Catalog)
    -> Result<Outcome, RuleError>;

pub struct Outcome {
    pub state: GameState,
    pub gains: Vec<Gain>,        // what UI shows per turn
}

pub fn replay(setup: &Setup, events: &[Event], cat: &Catalog, mode: Mode)
    -> ReplayResult;             // final state + per-turn snapshots + report
```

## 4. WASM integration

- `mentat-wasm`: `wasm-bindgen` + `serde-wasm-bindgen`; API surface kept
  coarse to amortize boundary costs: `load(docJson) -> handle`,
  `applyAction(handle, actionJson)`, `snapshotAt(handle, turn)`,
  `validate(docJson)`, `summarize(docJson)`.
- State lives **inside** the WASM module (handle pattern); JS receives
  serialized snapshots only when rendering needs them. Avoid shuttling full
  state JSON per action.
- Build via `wasm-pack`, ship as an npm workspace package; Vite loads it
  async at app bootstrap (engine is ready before any game screen).
- React integration: `GameProvider` keeps `useReducer` shape but delegates to
  the WASM engine; `dispatch` becomes `applyAction` + state refresh. The
  recording wrapper from `01` is unchanged.

## 5. Catalog generation (don't hand-port card data)

`client/src/data/{cards,boardSpaces,conflicts,leaders,signetRingEffects,…}.ts`
stay the **authoring source**. A codegen step (small TS script) emits
`catalog.v1.json`; `mentat-catalog` embeds it (`include_str!`) and parses at
compile time into typed structs. Custom effects remain a Rust `enum
CustomEffect` mirrored against `CustomEffect` in `GameTypes.ts`; CI fails if
the variant lists drift.

## 6. Port order (each step lands with differential tests green)

1. Types + serde + catalog codegen; round-trip `catalog.v1.json`.
2. Pure helpers: semantic ids (`02`), cost/affordability checks, influence
   math.
3. Core agent turn: `PLAY_CARD`, `PLACE_AGENT`, `DEPLOY/UNDEPLOY/RETREAT`,
   `PAY_COST`, `CLAIM_REWARD(_ALL)`, `RESOLVE_CHOICE`, `RESOLVE_CARD_SELECT`,
   `TRASH_CARD`, `END_TURN`.
4. Reveal turn: `REVEAL_CARDS`, acquisitions (`ACQUIRE_CARD/AL/SMF`,
   `SELECT_IMPERIUM_REPLACEMENT`, `RESET_IMPERIUM_ROW`).
5. Combat: `START_COMBAT_PHASE`, `PLAY_COMBAT_INTRIGUE`, `PASS_COMBAT`,
   `RESOLVE_COMBAT`, `RESOLVE_CONFLICT_REWARD_CHOICE`, makers/recall,
   round transitions, `SELECT_CONFLICT`.
6. Intrigue (`PLAY_INTRIGUE` + custom effects), opponent-discard flows,
   leader abilities, endgame (`RESOLVE_ENDGAME`).
7. Sandbox actions + `DEBUG_PATCH`; validation modes (`03`); summary/stats
   projections.
8. Swap browser engine to WASM behind a flag → differential soak (record with
   TS, verify with Rust on every END_TURN) → remove TS reducer.

## 7. Tasks

- [ ] Scaffold cargo workspace + CI (fmt, clippy, test, wasm-pack build).
- [ ] Catalog codegen script + drift check for `CustomEffect`.
- [ ] Implement §6 steps 1–7 with per-step golden tests (see `06`).
- [ ] `mentat-cli`: `validate`, `replay --at <turn>`, `summary`, `stats`
      (flat per-turn CSV/JSON export for analytics).
- [ ] WASM wrapper + npm package + Vite bootstrap.
- [ ] `GameProvider` delegation behind `VITE_ENGINE=wasm|ts` flag.
- [ ] Soak period checklist + TS reducer removal.

## 8. Learning notes (requested)

Good first issues to write by hand rather than generate: the `Action` enum +
serde attributes, `RuleError` with `thiserror`, the occurrence-counter id
helper, and one reducer case end-to-end (`DEPLOY_TROOP` is the smallest).
Patterns this codebase will teach: enums-with-data as state machines,
`Result` plumbing instead of silent returns, borrow-then-build (`&GameState`
in, owned `GameState` out), and property tests with `proptest` (e.g. "replay
of any recorded log is deterministic").
