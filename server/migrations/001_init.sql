CREATE TABLE users (
    id         TEXT PRIMARY KEY,
    user       TEXT NOT NULL UNIQUE,
    hash       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE games (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   TEXT NOT NULL REFERENCES users(id),
    summary    JSONB NOT NULL,
    content    JSONB NOT NULL,
    name       TEXT PRIMARY KEY NOT NULL,
    version    INTEGER PRIMARY KEY DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (strftime('%s', 'now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- CREATE TABLE session_games {
--     session_id TEXT REFERENCES tower_sessions(id),
--     game_id    INTEGER REFERENCES games(id),
--     PRIMARY KEY (session_id, game_id)
-- };
-- // TODOO
-- // 
-- // 2. limit 3 created games per session
-- // 3. limit n sessions or till some size
-- // 4. delete expired sessions and games
-- // 5. saniitze save json against size and contents. (sql injection)