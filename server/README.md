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
| `.env.example` | Template for `DATABASE_URL` |

## Prod (notes)

Typical layout:

- **nginx** serves `client/dist` (static Vite build) and proxies `/api/*` to the Rust binary.
- **Rust** runs as a service (e.g. systemd) on `127.0.0.1:3000` with `DATABASE_URL` pointing at a persistent path such as `/var/lib/my-mentat/data.db`.
- Run `sqlx migrate run` on deploy (or from the app on startup when you wire that up).
- Back up the `.db` file periodically, e.g. `sqlite3 /var/lib/my-mentat/data.db ".backup /backups/mentat-latest.db"`.

## When you wire up Rust

1. Create one `SqlitePool` at startup in `main.rs` and pass it via Axum `State`.
2. Load `.env` in dev with `dotenvy::dotenv().ok()`.
3. Optionally run `sqlx::migrate!("./migrations").run(&pool).await?` on boot.
