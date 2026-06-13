# 05 — Server API (axum) & Published Catalogs

External producers (other apps, CLI, integrations) need: the schema, the id
catalogs, validation, and game storage/sharing. One axum service wrapping
`mentat-engine`. The browser app does **not** depend on this server for normal
use (WASM engine is local); the server is for sharing and external access.

## 1. Stack

- `axum` (HTTP, routing, extractors) on `tokio`; `tower`/`tower-http` layers
  for timeouts, body limits, CORS, compression, tracing, rate limiting
  (`tower_governor`).
- `tracing` + `tracing-subscriber` for structured logs.
- Storage v1: Postgres via `sqlx` (games table: id, owner, doc JSONB,
  summary JSONB, timestamps). The doc is small (tens of KB) — JSONB is fine;
  no need to normalize events into rows until analytics demands it.

## 2. Endpoints (v1)

```
GET  /v1/schema/save-doc.json          # generated JSON Schema (03)
GET  /v1/catalogs                      # index: versions, expansions
GET  /v1/catalogs/cards               # id, name, cost, factions, agentIcons, effects
GET  /v1/catalogs/board-spaces        # id, name, agentIcon, cost, combat, maker…
GET  /v1/catalogs/conflicts           # id, tier, name, rewards
GET  /v1/catalogs/leaders             # id, name, complexity, ability text
GET  /v1/catalogs/choice-ids          # the id grammar (02) + kinds enum + examples
GET  /v1/catalogs/rules               # validation rule ids + messages (03)

POST /v1/games:validate               # body: save doc → ValidationReport (no persist)
POST /v1/games                        # import/create (validates strict first)
GET  /v1/games                        # owner's list: meta + summary only
GET  /v1/games/{id}                   # full doc
PUT  /v1/games/{id}                   # replace doc (re-validates; optimistic concurrency via If-Match etag)
DELETE /v1/games/{id}
POST /v1/games/{id}/share             # create share token → public read-only link
GET  /v1/shared/{token}               # read-only fetch by share token
POST /v1/games/{id}:replay?at=turn    # server-side replay → state snapshot at turn (for thin clients)
POST /v1/games/{id}:stats             # flat per-turn rows for analytics
```

Catalogs are versioned by `schemaVersion` + `expansions` query params and
served with strong ETags / long cache headers (they change only on release).

## 3. Security (industry-standard checklist)

- **AuthN**: bearer tokens (start with static API keys per user, hashed at
  rest with argon2; upgrade path to OIDC). Share links use random 128-bit
  tokens, revocable, read-only scope.
- **AuthZ**: every game row has an owner; object-level checks on each handler
  (no "list then filter in client").
- **Secrets/config via environment variables only** (`DATABASE_URL`,
  `API_KEY_PEPPER`, bind address); never in the repo, never sent to the
  browser. Provide `.env.example` with placeholders.
- **Input hardening**: body size limit (e.g. 1 MB — a legit doc is ≤100 KB),
  strict serde (`deny_unknown_fields`), request timeouts, per-IP and per-key
  rate limits, validation *before* persistence (a stored doc is always
  replayable).
- **Transport**: TLS terminated at the proxy; HSTS; CORS allowlist for the
  web app origin (catalogs/schema may be public CORS).
- **Output**: no internal errors leaked (map to rule ids / generic 500 with
  trace id); structured audit log for create/update/delete/share.
- **Supply chain**: `cargo audit` / `cargo deny` in CI; pinned lockfile.
- SQL: `sqlx` compile-checked queries only — no string-built SQL.

## 4. CLI parity

`mentat-cli` consumes the same crate directly (no HTTP needed) but also gets
`--remote` mode hitting this API with an API key from `MENTAT_API_KEY` env
var. Commands: `validate`, `replay`, `summary`, `stats`, `push`, `pull`.

## 5. Tasks

- [ ] Scaffold `mentat-server` (axum + tower layers + tracing + config from
      env; graceful shutdown).
- [ ] Catalog endpoints serving generated `catalog.v1.json` slices + ETags.
- [ ] Schema endpoint from `schemars` output.
- [ ] `games` CRUD + `:validate` using engine strict mode; Postgres schema +
      migrations (sqlx).
- [ ] Share tokens + read-only route.
- [ ] AuthN middleware (API keys), per-key rate limiting, body limits.
- [ ] `:replay` and `:stats` endpoints (reuse engine replay/projections).
- [ ] Integration tests: spawn server with test DB; golden doc import →
      fetch → replay parity with local engine; authz denial tests; oversized /
      malformed body tests.
- [ ] Deployment notes: single container, env-var config, healthcheck
      endpoint, `cargo audit` CI gate.
