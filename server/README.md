# my-mentat server — SQLite

Local dev database and migrations. Rust handlers are not wired to the DB yet; this scaffolding is ready for when you connect `dao.rs` / `main.rs`.

## Prerequisites

Install the SQLx CLI (once). Use **0.8.x** if your Rust toolchain is below 1.94 (matches `sqlx` in `Cargo.toml`):

```bash
cargo install sqlx-cli --version 0.8.6 --no-default-features --features sqlite
```

## Dev database

From this directory (`server/`):

```bash
cp .env.example .env
export DATABASE_URL=sqlite://data/dev.db?mode=rwc
sqlx migrate run
sqlite3 data/dev.db ".tables"
```

Expected tables: `users`, `sessions`, `games`.

Inspect schema:

```bash
sqlite3 data/dev.db ".schema"
```

## `DATABASE_URL`

SQLite has no username/password on the connection string. Access is the file path plus OS file permissions.

| Environment | Example |
|-------------|---------|
| Dev (relative to `server/`) | `sqlite://data/dev.db?mode=rwc` |
| Prod (absolute path on VPS) | `sqlite:///var/lib/my-mentat/data.db?mode=rwc` |

`?mode=rwc` creates the file if it does not exist.

Copy `.env.example` to `.env` for local work. `.env` is gitignored.

## Files

| Path | Purpose |
|------|---------|
| `migrations/` | Schema versions applied by `sqlx migrate run` |
| `data/dev.db` | Local database file (gitignored; created by migrate) |
| `data/seeds/owned_game.sql` | Dev seed: user `1` + owned sandbox game (id 19); run after migrate on a fresh DB |
| `.env.example` | Template for `DATABASE_URL` |

## Prod (notes)

Typical layout:

- **nginx** serves `client/dist` (static Vite build) and proxies `/games/*` to the Rust binary. Use `client_max_body_size 1m;` to match Axum.
- Cache static images for 1 year (`location ~* \.(avif|png|jpe?g|webp|gif|svg|ico|woff2)$` with `Cache-Control: public, immutable`). SPA shell (`location /`) stays `no-cache`.
- **Later:** nginx `limit_req` (and/or Axum rate limits) on `/games/` — especially `/games/save` and `/games/new` — so autosave spam and anon creates cannot hammer SQLite.
- **Rust** runs as a service (e.g. systemd) on `127.0.0.1:3000` with `APP_ENV=prod` and `DATABASE_URL` pointing at a persistent path such as `/var/lib/my-mentat/data.db`.
- `APP_ENV=prod` binds `127.0.0.1`, sets Secure cookies, disables CORS (same-origin), and keeps a 1 MiB body limit. Override with `BIND_ADDR` / `CORS_ORIGINS` if needed.
- `APP_ENV=dev` (default) binds `0.0.0.0`, allows CORS from `http://localhost:5173` (or `CORS_ORIGINS`), Secure=false.
- Run `sqlx migrate run` on deploy (or from the app on startup when you wire that up).
- Back up the `.db` file periodically, e.g. `sqlite3 /var/lib/my-mentat/data.db ".backup /backups/mentat-latest.db"`.

## When you wire up Rust

1. Create one `SqlitePool` at startup in `main.rs` and pass it via Axum `State`.
2. Load `.env` in dev with `dotenvy::dotenv().ok()`.
3. Optionally run `sqlx::migrate!("./migrations").run(&pool).await?` on boot.
