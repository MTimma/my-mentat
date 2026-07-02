-- datetime('now', 'unixepoch') evaluates to NULL in SQLite; use unix epoch seconds instead.
PRAGMA foreign_keys=OFF;

CREATE TABLE games_new (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   TEXT REFERENCES users(id),
    json       TEXT NOT NULL,
    name       TEXT NOT NULL DEFAULT ('Dune Imperium game'),
    updated_at TEXT NOT NULL DEFAULT (strftime('%s', 'now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%s', 'now'))
);

INSERT INTO games_new (id, owner_id, json, name, updated_at, created_at)
SELECT
    id,
    owner_id,
    json,
    name,
    COALESCE(NULLIF(updated_at, ''), strftime('%s', 'now')),
    COALESCE(NULLIF(created_at, ''), strftime('%s', 'now'))
FROM games;

DROP TABLE games;
ALTER TABLE games_new RENAME TO games;

PRAGMA foreign_keys=ON;
