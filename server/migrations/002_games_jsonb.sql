-- Legacy VPS schema: games.json TEXT → content/summary JSONB (SQLite 3.53+).
-- Fresh DBs that already match the target shape are no-ops.

ALTER TABLE games ADD COLUMN content JSONB;
ALTER TABLE games ADD COLUMN summary JSONB;
ALTER TABLE games ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

UPDATE games
SET content = jsonb(json)
WHERE content IS NULL AND json IS NOT NULL;

UPDATE games
SET summary = jsonb(
  COALESCE(
    json_extract(json, '$.summary'),
    json_object(
      'gamePackId',
      COALESCE(json_extract(json, '$.setup.gamePackId'), 'official/base'),
      'rounds',
      COALESCE(json_extract(json, '$.setup.currentRound'), 1),
      'turns',
      0,
      'players',
      json_array()
    )
  )
)
WHERE summary IS NULL AND json IS NOT NULL;

CREATE TABLE games_jsonb (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   TEXT NOT NULL REFERENCES users(id),
    name       TEXT NOT NULL,
    summary    JSONB NOT NULL,
    content    JSONB NOT NULL,
    version    INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (strftime('%s', 'now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%s', 'now'))
);

INSERT INTO games_jsonb (id, owner_id, name, summary, content, version, updated_at, created_at)
SELECT id, owner_id, name, summary, content, version, updated_at, created_at
FROM games
WHERE summary IS NOT NULL AND content IS NOT NULL;

DROP TABLE games;
ALTER TABLE games_jsonb RENAME TO games;
