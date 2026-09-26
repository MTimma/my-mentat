# WIP — Shared Rust reducer (native server + browser WASM)

Status: sketch only. Not started. Detail for the port itself stays in `04-rust-engine.md`. This note is why we would do it, and in what order.

Today the rules live only in the TypeScript reducer (`GameContext`). `summarize()` replays that reducer. Nothing in the React app calls it on save, and the save JSON does not store a winner. `RESOLVE_ENDGAME` is `{ "type": "RESOLVE_ENDGAME" }` with no player ids. A list row cannot show a winner unless something runs the rules.

## Benefit

One replay of one saved game is already fast in TypeScript. WASM does not pay for itself there.

It pays off when the same `reduce(state, action)` is the only rules implementation, compiled twice:

| Where | What it is for |
|---|---|
| Native (this server, later a CLI) | On save, replay once and store `summary` (winner, VP, rounds, players, pack). `GET /games` reads that column. Also batch work: many games, deep search. |
| WASM, shipped with the React app | Same rules in the browser. Turn navigation, what-if branches, and a single-board search stay local. No round trip per click. |

Best-turn search and simulations sit on top of that function. They are not a reason to port by themselves, and they are not the first step. The reducer answers "apply this action." Search still needs a legal-move generator and a score. Hidden cards are often missing in this app (logging a physical game, not a full digital match), so a search can only rank what the log actually contains.

Do not run search on `GET /games`. Do not parse the full JSON blob per list row.

## Order

1. **Port the TypeScript reducer to Rust.** One pure crate (`mentat-engine` in `04`): `reduce`, `replay`, `summarize`. No HTTP and no WASM bindings inside it. TypeScript stays the reference until golden logs match (`06-test-plan.md`).

2. **Compile that crate twice.** Native library linked by `server/` (axum stays the HTTP shell). `wasm-bindgen` wrapper built with the client and served by Vite next to the React app. Same code, two targets. Browser calls a coarse API (`replay`, `summarize`, `apply`) so the full state is not copied across the JS boundary on every action.

3. **Server writes `summary` at save time.** `POST /games/save` runs `summarize` and stores the result in the `summary` column (`001_init.sql` already has the column; the handler does not fill it). List endpoint returns that column. Winner is set only when replay ends in exactly one winner. Ties and unfinished games stay null. Until step 1 exists, the client still does not send a summary.

4. **Browser uses the WASM build for replay and for one-game search.** Live logging can keep the TypeScript reducer until parity is proven, then switch. Interactive "best next action" on the open board runs in WASM. Many-game or long searches run on the native crate (server or CLI), with a time or node limit so a request cannot pin a worker.

5. **Delete the TypeScript reducer** after the soak in `04` (record with one engine, check with the other on `END_TURN`).

## Out of this note

- Crate layout, type mapping, and port order: `04-rust-engine.md`.
- HTTP shape and auth: `05-server-api-and-catalogs.md`.
- Player display names. Setup stores `leaderId` and `color`, not a name. The list can show the leader id without a new field.
- PWA / offline caching. WASM in the bundle is not offline until the app shell is cached (`00-overview.md` §3).
