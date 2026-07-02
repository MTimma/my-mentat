CREATE TABLE users (
    id         TEXT PRIMARY KEY,
    user       TEXT NOT NULL UNIQUE,
    hash       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE games (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   TEXT REFERENCES users(id),
    json       TEXT NOT NULL,
    name       TEXT NOT NULL DEFAULT ('Dune Imperium game'),
    -- etag       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'unixepoch')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'unixepoch'))
);
