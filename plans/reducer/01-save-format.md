# 01 — Save Document Format

One JSON document per game, loaded at once by the client. Events are the
source of truth; everything else is derived or cached.

## 1. Document shape (`schemaVersion: 1`)

```jsonc
{
  "schemaVersion": 1,
  "meta": {
    "id": "uuid",                  // generated at save-doc creation, OUTSIDE the reducer
    "title": "Friday game vs. Abby & Ned",
    "createdAt": "2026-06-10T08:00:00Z",
    "updatedAt": "2026-06-12T19:30:00Z",
    "appVersion": "1.4.0",         // engine version that recorded the log
    "notes": ""
  },

  "setup": {
    "firstPlayer": 0,
    "players": [
      {
        "id": 0,
        "leaderId": "paul-atreides",     // catalog id, not embedded Leader object
        "color": "red",
        "deckCardIds": [101, 102, ...],  // template ids, physical order unknown → logical order
        "startingHandIds": [101, 103, ...]
      }
    ],
    "imperiumRowCardIds": [2001, 2002, 2003, 2004, 2005],
    "imperiumRowDeckCardIds": [...],     // optional; omitted = full default pool
    "initialConflictId": 7,
    "expansions": []                     // future: ["rise-of-ix"]
  },

  "events": [ ... ],                     // trunk — append-only, never rewritten
  "branches": [
    {
      "id": "b1",
      "parent": "trunk",                 // or another branch id
      "forkAtEvent": 57,                 // index into parent's events
      "label": "what-if: took Heighliner",
      "createdAt": "...",
      "events": [ ... ]
    }
  ],
  "cursor": { "branch": "trunk", "event": 212 },   // where the user last was

  "summary": {                           // cached projection for list views — never read as truth
    "rounds": 9,
    "winner": 1,
    "finalVp": { "0": 9, "1": 11, "2": 8 },
    "players": [{ "id": 0, "leaderId": "paul-atreides", "color": "red" }],
    "endedAt": "...",
    "eventCount": 214
  }
}
```

## 2. Event entry shape

Events are the existing `GameAction` payloads (post `02-deterministic-ids.md`
changes) plus a thin envelope:

```jsonc
{ "a": { "type": "PLAY_CARD", "playerId": 0, "cardId": 103 } }
{ "a": { "type": "END_TURN", "playerId": 0 },
  "ck": { "p0": [5, 2, 1, 3, 0] } }       // optional checksum: [spice,solari,water,troops,vp]
```

- `ck` (checksum) is written on `END_TURN` events during recording and verified
  on replay → divergence detector ("replay diverged at event 57 / turn 14").
- No timestamps/ids per event in v1 (keep entries small); `meta.updatedAt`
  covers freshness. Revisit if analytics needs per-event timing.

### Replayable action allowlist

Everything in `GameAction` **except**:

- `UNDO_TO_TURN`, `UNDO_TO_SETUP` — these become *branch operations* on the
  document (fork / cursor moves), never log entries. The saved game is never
  rewritten by undo (user requirement).
- UI-only actions, if any are added later.

`SANDBOX_*` actions **are** replayable events (sandbox games are ordinary
logs). Add `DEBUG_PATCH` (whitelisted semantic patch, see `03`) as a
replayable event for debug-mode edits.

### Dead action cleanup

- `DRAW_INTRIGUE` is declared in the union but has no reducer case — delete it
  so it can never appear in logs as a silent no-op.

## 3. Recording (dispatch boundary)

Wrap `dispatch` in `GameProvider`:

```ts
const dispatchAndRecord = (action: GameAction) => {
  if (REPLAYABLE.has(action.type)) recorder.append(action)
  dispatch(action)
}
```

- Record at the dispatch boundary **only** — internal recursive
  `gameReducer(...)` calls (e.g. `MOBILIZE_GARRISON` → `DEPLOY_TROOP`) are
  consequences, not events, and must not be logged.
- Dev-mode assertion: `JSON.parse(JSON.stringify(action))` deep-equals the
  action → any non-serializable payload fails at introduction time.
- Each in-memory `history` snapshot carries `eventCount` (events recorded when
  the snapshot was taken) so branch forks map turn ↔ event index.

## 4. Undo / branching semantics

- **View history**: read-only replay-cache lookup; touches nothing.
- **Undo + continue differently**: create branch `{ parent, forkAtEvent }`,
  set `cursor` to it, append new events there. Trunk untouched.
- **Amend trunk** (fix a mislogged action): explicit, separate operation that
  splices trunk events and re-replays with divergence checks; never a side
  effect of undo.
- Active line state = replay(setup → parent prefix → branch events). Cache one
  snapshot array per visited line; drop caches on memory pressure.

## 5. Load / save plumbing

- [ ] `buildInitialState(setup)`: single function shared by the setup screens
      and the loader (today the logic lives across `GameSetup` /
      `GameStateSetup` / `ImperiumRowSetup`). Outputs the same `GameState` the
      reducer expects, resolving catalog ids → card/leader objects.
- [ ] `replayGame(doc, line)`: fold events through the reducer, building the
      snapshot history; verify `ck` checksums; return `{ state, snapshots,
      divergences }`.
- [ ] `summarize(doc)`: recompute `summary` from a finished replay (used at
      save time and whenever `summary` schema changes).
- [ ] Persistence v1: localStorage index + export/import as `.json` file
      download. (Server sharing comes with `05`.)

## 6. Tasks

- [ ] Define TS types for the document (`SaveDoc`, `SetupBlock`, `EventEntry`,
      `Branch`, `Summary`) in a UI-free module (it will be mirrored by serde
      structs in Rust — keep it flat and plain).
- [ ] Implement `REPLAYABLE` allowlist + `dispatchAndRecord` wrapper.
- [ ] Implement `eventCount` on history snapshots.
- [ ] Implement branch fork on undo (replace history-truncation behavior of
      `UNDO_TO_TURN` with fork; keep in-memory behavior identical for the UI).
- [ ] Implement `buildInitialState`, `replayGame`, `summarize`.
- [ ] Saved-games list screen reads `meta` + `summary` only.
- [ ] Round-trip test: record a scripted game → save → load → replay →
      deep-equal final states; checksum mismatch surfaces correctly when the
      reducer is deliberately altered in a test.
