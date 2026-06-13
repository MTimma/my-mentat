# Reducer Migration — Event-Sourced Saves + Rust Engine (Overview)

This folder contains the plan for migrating `my-mentat` game persistence from
full-`GameState`-snapshot history to an **event-sourced save format**, and for
porting the game reducer to a **Rust engine** (native crate + axum API first;
WASM in the browser last, after differential tests pass).

> **App context.** `my-mentat` is a logging / analysis / replay tool for
> physical Dune: Imperium games. There is **no randomness in the app**: every
> "draw" or "shuffle outcome" is entered by the user. Therefore the dispatched
> `GameAction` stream is a complete, deterministic record of a game — the save
> format *is* the action log.

---

## Status (2026-06-12) — TS-side refactor implemented

- **02 Deterministic ids: DONE.** All `crypto.randomUUID()` sites (reducer +
  `influenceChoices` / `signetRingEffects` / `leaderAbilities` / memnon helper)
  replaced with semantic ids via `src/utils/semanticIds.ts`
  (`<sourceType>-<sourceId>-<kind>[-<occurrence>]`, occurrence counted over
  live pending entries). Round-trip replay equality is asserted in
  `src/save/__tests__/saveRoundTrip.test.ts`.
- **02 Decision events: DONE.** `RESOLVE_CHOICE` / `RESOLVE_CONFLICT_REWARD_CHOICE`
  accept `optionIndex` (legacy `reward` payload still accepted);
  `PAY_COST` accepts `effectId` + `data` (legacy `effect` still accepted);
  `DRAW_INTRIGUE` removed (no reducer case existed). All UI dispatch sites
  emit decision events. Tests: `__tests__/decisionEvents.test.ts`.
- **05 Catalogs: DONE (static publishing).** `src/catalog/buildCatalog.ts` +
  `npm run generate:catalogs` → `public/catalogs/*.v1.json` (cards, effects
  registry, board spaces, conflicts, intrigue, leaders, choice-id grammar).
  Rewards/costs live ONLY in the `effects` registry; card entries reference
  effect ids. NOTE: authored numeric card ids in `cards.ts` are not unique
  (e.g. 1036, 1026 collide across/within pools) — catalog ids are
  `<pool>/<name-slug>`; numeric ids remain instance-level only.
- **01 Save format: DONE (recording + replay).** `src/save/` — `types.ts`
  (SaveDoc/branches/cursor/checksums), `recording.ts` (REPLAYABLE allowlist,
  serializability guard, checksums), `replay.ts` (replayEvents, branch fold,
  divergence detection, summarize, GameRecorder), `buildInitialState.ts`
  (catalog ids → GameState genesis), `deriveSetup.ts` (live UI setup →
  SetupBlock). `GameProvider` records every replayable action and exposes
  `exportSaveDoc()` / `getRecordedEventCount()` via context.
- **06 Tests: priority-1 suites added** (`revealTurn`, `endTurnGating`,
  `trashCard`, `opponentDiscard`, `decisionEvents`, `semanticIds`, `catalog`,
  `saveRoundTrip`). Suite: 30 files / 297 passing.
- **Not yet done:** save/load UI (export button, load-from-doc screen), golden
  log corpus, runtime self-verification toggle, Rust port (03/04/05 API).

---

## 1. Why (findings from the 2026-06-10 audit)

1. **Current de-facto save = `GameState` with `history: GameState[]`** — one
   full deep snapshot per turn, each embedding every card pile as full `Card`
   objects. A finished game serializes to an estimated 15–50 MB with ~99.9%
   redundancy.
2. **`GameState` cannot round-trip JSON**: `combatPasses` / `endgameDonePlayers`
   are `Set`s (serialize to `{}`), `CardSelectChoice.filter` / `onResolve` are
   functions, `Leader` is a class.
3. **Action payloads are JSON-safe** (audited every dispatch site) — the action
   stream is already a valid event vocabulary.
4. **One determinism blocker**: `crypto.randomUUID()` is called inside the
   reducer (~17 sites + 4 helper files) to mint `choiceId` / `rewardId`.
   Recorded `RESOLVE_CHOICE` / `RESOLVE_CARD_SELECT` / `CLAIM_REWARD` /
   `PAY_COST` events reference those ids; on replay the reducer mints different
   ids and the events silently no-op. See `02-deterministic-ids.md`.
5. No component mutates state outside `dispatch`; no `Math.random` /
   `Date.now` in the live game path (the `IntrigueDeckService` shuffle is only
   instantiated in its own test). `SHUFFLE_DISCARD_INTO_DECK` is deterministic
   concatenation.

## 2. Target architecture (phased)

**Phase A–C** (ship first): TS reducer stays in the browser for live play;
Rust engine runs as native lib + CLI + axum API. **Phase D** (last): swap the
browser to WASM once golden tests prove parity.

```
┌────────────────────────────────────────────────────────────┐
│ mentat-engine (Rust crate, pure)                           │
│   state types · actions/events · reduce(state, event)      │
│   validation · semantic ids · summary/stats projections    │
└──────────────┬──────────────────────────┬──────────────────┘
               │ Phase D (last)           │ Phase C (first Rust consumers)
        ┌──────▼───────┐          ┌───────▼────────┐
        │ browser app  │          │ axum API server │
        │ WASM engine  │          │ import/validate │
        │ (offline)    │          │ replay/:at      │
        └──────────────┘          │ share, catalogs │
                                  │ bulk analytics  │
                                  └────────────────┘
        Phase A–B: browser still uses TS reducer via dispatch
```

**Load / replay flow during Phase C** (server reducer, no WASM yet):

1. Client loads the save doc (local file or `GET /v1/games/{id}`).
2. On open / branch switch: `POST /v1/games/{id}:replay?at=turn` (or replay
   locally via `mentat-cli` during dev) → server folds events → returns state
   snapshot + per-turn checksums.
3. Client caches snapshots in memory; turn-history clicks are O(1) lookups.
4. **Each new action** during live logging still goes through the TS reducer
   until Phase D; optionally mirror to the server for validation
   (`POST …:validate` or apply-on-server in a later sub-phase).

After Phase D the same `mentat-engine` crate moves into the browser via WASM;
the API remains for sharing, external imports, and bulk analytics.

- **Save document** (`01-save-format.md`): one JSON file — `setup` +
  append-only `events` trunk + `branches` (undo/what-if never rewrites the
  trunk) + cached `summary` for list views.
- **Replay**: load → `events.fold(reduce)` → in-memory snapshots per turn are
  rebuilt during the single replay pass, so `TurnHistory` navigation stays an
  O(1) array lookup. Replay re-runs only on load / branch switch / event edit.
- **Reducer-fix policy**: events record *decisions* (which option), never
  *outcomes* (reward payloads), so fixing engine rules retroactively corrects
  old games on replay. Divergence detection (checksums per `END_TURN`) reports
  exactly which saved games/turns a rules fix affects.
- **Sandbox / debug**: `SANDBOX_*` actions already exist; add a whitelisted
  `DEBUG_PATCH` event so manual corrections are recorded, attributed and
  replayable (see `01` / `03`).

## 3. Where the reducer runs — three options

| | **A. TS in browser** (today) | **B. Rust on server via API** | **C. WASM in browser** |
|---|---|---|---|
| Offline / no network | yes | no — replay and each apply need the API | yes |
| Latency per action | instant | round-trip (~50–200 ms); painful for live logging | instant |
| Load game / replay | local fold | one API call returns snapshots | local fold |
| Sharing / external import | export JSON file | natural fit | same API still useful |
| Engine count during migration | 1 | 2 (TS live + Rust replay) | 1 (after cutover) |
| Rust practice | none | server + CLI | server + CLI + WASM |
| Bundle size | none added | none added | +~150–400 KB gzipped |

**Server-replay-only** (open game → `POST :replay` → cache snapshots; live
actions still TS, or eventually `POST :apply` per action) is a valid
**intermediate** architecture: you get a real Rust engine, published catalogs,
and import/validate/share without touching browser build tooling. Downsides:
no offline replay until WASM or a local CLI; live logging still needs the TS
reducer (two engines in flight); branch switches and undo replay hit the
network unless you cache aggressively or ship snapshot checkpoints in the
save doc.

**WASM** is the long-term fit for this app because it is a **logging tool**
that should work offline with the physical board, and turn navigation should
not wait on the network. WASM does not buy meaningful single-replay speed in
the browser (TS is already ms); the win is **one engine everywhere** and
correct offline behavior.

### Decision (phased)

1. **Now → golden tests green**: TS reducer remains the reference; write missing
   tests (`06`), fix deterministic ids (`02`), introduce save format (`01`).
2. **Rust crate + CLI + axum API** (`04`, `05`): port against golden logs;
   browser may call `:replay` / `:validate` for load and import; **live play
   still uses TS**.
3. **WASM last** (`04` Phase D): only after differential tests pass; swap
   `GameProvider` to WASM behind a flag; soak; delete TS reducer.

> **Verdict:** WASM is a good fit for the end state (shared engine, Rust
> practice, offline logging). Size and compatibility are non-issues. The only
> real cost is build/tooling complexity (`wasm-pack`, async bootstrap before
> `GameProvider`, debugging across the JS boundary).
>
> **Lowest-friction path:** start the Rust crate as a **native library +
> CLI**, prove it with golden tests, ship the **axum API** for sharing and
> external producers, then add the **WASM wrapper last** once differential
> tests pass — Rust practice starts immediately without blocking the app on
> WASM integration on day one.

Risk is contained by the test strategy: the TS reducer remains the reference
implementation until differential tests pass (see `06-test-plan.md`); missing
TS unit tests are written **first** so expected behavior is pinned before any
port.

### AI / analytics — WASM vs server (both use the same crate)

| Workload | Best runtime | Why |
|---|---|---|
| Replay one game, navigate turns | WASM or TS | ms either way; WASM wins on parity with server rules |
| Per-game stats ("VP curve", gains by turn") | WASM in browser | no upload; instant after load |
| What-if on one branch (edit event → re-replay) | WASM in browser | interactive; no round-trips |
| Bulk stats across many saved games | **server native Rust** | rayon parallelism; no shipping N games + WASM to every client |
| ML feature extraction / training datasets | **server** (or offline CLI) | batch jobs; TB-scale I/O; long CPU |
| AI assistant "analyze this game" (single doc) | WASM **or** server | WASM = data stays on device; server = simpler if game is already synced |
| Cross-user leaderboards / meta stats | **server** | needs shared DB anyway |

**WASM is not inherently better for AI/analytics** — it is better for
**interactive, single-game analysis on the client** (privacy, latency). Heavy
or multi-game work belongs on the **same Rust engine compiled natively** behind
the API (`POST :stats`, batch CLI, background jobs). The architecture already
supports both: one `mentat-engine` crate, two compile targets (native + wasm).

### "Offline" on the web — what it actually means

WASM does **not** make an app offline-capable by itself. Offline requires
**explicit PWA plumbing** (not in the codebase today):

1. **Service worker** — caches the app shell (HTML, JS, CSS), the `.wasm`
   module, and static catalogs on first visit.
2. **IndexedDB** (or localStorage for small docs) — stores saved game JSON
   locally on the device.
3. **Web app manifest** — "Add to Home Screen" on mobile; optional.

With that in place, a user who opened the app once can log a physical game
with no network: WASM replays from local saves, TS/WASM reducer applies
actions locally. Without PWA setup, a normal SPA needs network on every fresh
visit (browser may cache assets opportunistically, but saves are not
persistent across devices and reload behavior is unreliable).

**Mobile:** iOS/Android PWAs can run WASM and read IndexedDB offline after
install + first load. WASM compile on first open may cost ~100–300 ms on older
phones; cached visits are fine. Saved games live in **browser storage**, not
inside the WASM binary.

**Implication for phasing:** server API gives sharing and bulk analytics
online; WASM + PWA (a separate small task, can trail Phase D) gives true
offline logging at the table. Until PWA ships, "offline" in the browser means
"session-local" (in-memory + export JSON file), which many logging workflows
already tolerate.

## 4. Plan files & sequencing

| # | File | Depends on |
|---|---|---|
| 1 | `01-save-format.md` — save document, branches, summary block | — |
| 2 | `02-deterministic-ids.md` — semantic choice ids, `optionIndex` decisions, uuid removal | — |
| 3 | `03-event-schema-validation.md` — structural + semantic event validation | 1, 2 |
| 4 | `06-test-plan.md` — missing TS reducer tests + golden logs (**do before the port**) | 2 |
| 5 | `04-rust-engine.md` — crate layout, type mapping, port order; **WASM last** | 2, 3, 6 |
| 6 | `05-server-api-and-catalogs.md` — axum service, security, published id catalogs | 3, 4 |

Recommended order of execution:

**02 → 06 (tests) → 01 → 03 → 04 (native + CLI) → 05 (API) → 04 Phase D (WASM).**

Deterministic ids first (small, unblocks everything), then pin behavior with
tests, then the format, then the native engine and server API, then browser
WASM only after golden parity is proven. PWA/offline storage can ship alongside
or shortly after WASM (see §3).

## 5. Out of scope

- Multiplayer / realtime sync.
- Migrating *old* saved snapshots (there is no shipped save feature yet; the
  event format starts at `schemaVersion: 1`).
- Hot-seat playable mode (per long-standing app context).
