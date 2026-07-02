use axum::{Json, extract::Path};
use sqlx::{Pool, Sqlite, SqlitePool, SqliteConnection, Connection, Row};
// use sqlx_core::types::Row;
use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use axum_anyhow::ApiResult;
// start with only save, for anonymous users just publish and share link
// 3 tabs - anonymous, community, official approved (tournaments, etc)

#[derive(sqlx::FromRow)]
#[derive(serde::Serialize)]
pub struct GameRow {
    id: i64,
    owner_id: Option<String>,
    name: String,
    json: String,
    updated_at: String,
    created_at: String,
}

#[derive(Deserialize)]
#[derive(Serialize)]
pub struct GameMeta {
    id: String,
    title: String,
    createdAt: String,
    updatedAt: String,
}
#[derive(Deserialize, Serialize)]
pub struct GameLog {
    schemaVersion: i32,
    meta: GameMeta,
    setup: serde_json::Value,
    events: serde_json::Value,
    branches: serde_json::Value,
    cursor: serde_json::Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    summary: Option<serde_json::Value>,
}

pub async fn save_game(Json(gameLog): Json<GameLog>) -> ApiResult<Json<i64>> {
    // validate length/sqllite injection or corruption
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = SqlitePool::connect(&db_url).await?;
    let mut conn = pool.acquire().await?;
    let name = &gameLog.meta.title;
    let json= serde_json::to_string_pretty(&gameLog)?;
// if exists, update
    let id = sqlx::query!(
        r#"
INSERT INTO games ( name, json, updated_at, created_at )
VALUES ( ?1, ?2, strftime('%s', 'now'), strftime('%s', 'now') )
        "#,
        name,
        json
    )
    .execute(&mut *conn)
    .await?
    .last_insert_rowid();

    Ok(Json(id))
}

#[axum::debug_handler]
pub async fn get_games() -> ApiResult<Json<Vec<GameRow>>> {
    // validate length/sqllite injection or corruption
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = SqlitePool::connect(&db_url).await?;
    let mut conn = pool.acquire().await?;
// TODO get only id/name, creator
//TODO pagination
    let games: Vec<GameRow> = sqlx::query_as!(
        GameRow,
        r#"
SELECT id, owner_id, name, json, updated_at, created_at FROM games ORDER BY updated_at DESC
        "#,
    )
    .fetch_all(&mut *conn)
    .await?;

    Ok(Json(games))
}

pub async fn get_game(Path(id): Path<i64>) -> ApiResult<Json<String>> {
    // validate length/sqllite injection or corruption
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = SqlitePool::connect(&db_url).await?;
    let mut conn = pool.acquire().await?;

    let game: GameRow = sqlx::query_as!(
        GameRow,
        r#"
SELECT id, owner_id, name, json, updated_at, created_at FROM games
        WHERE id = ?1"#,    
        id
    )
    .fetch_one(&mut *conn)
    .await?;

    Ok(Json(game.json))
}


// pub async fn save_user(user: &str, hash: &str) -> anyhow::Result<()> {
//     // validate user/hash
//     // if already exists user name
//     let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
//     let db = SqliteConnection::connect(&db_url).await?;
//     let pool = SqlitePool::connect(&env::var("DATABASE_URL")?).await?;
//     let mut conn = pool.acquire().await?;
//     sqlx::query!(
//         r#"
// INSERT INTO users ( user, hash )
// VALUES ( ?1, ?2 )
//         "#,
//         user,
//         hash
//     )
//     .execute(&mut conn)
//     .await?;
//     Ok(())
// }

// pub async fn get_user(user: &str) -> anyhow::Result<User> {
//     let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
//     let db = SqliteConnection::connect(&db_url).await?;
//     let pool = SqlitePool::connect(&env::var("DATABASE_URL")?).await?;
//     let mut conn = pool.acquire().await?;
//     let id = sqlx::query!(
//         r#"
//         SELECT id FROM users WHERE user = ?1
//         "#,
//         user
//     )
//     .fetch_one(&mut conn)
//     .await?;
//     Ok(id)
// }

// async fn get_game(
//     State(pool): State<Pool<Sqlite>>,
//     Extension(user): Extension<AuthUser>,
//     Path(game_id): Path<String>,
// ) -> Result<Json<SaveDoc>, AppError> {
//     let row = sqlx::query!(
//         "SELECT doc FROM games WHERE id = ?1 AND owner_id = ?2",
//         game_id,
//         user.id
//     )
//     .fetch_optional(&pool)
//     .await?;
//     let row = row.ok_or(AppError::NotFound)?; // same response for missing vs forbidden
//     Ok(Json(serde_json::from_str(&row.doc)?))
// }
// Share links (from your plan): separate table with random 128-bit token, read-only scope, revocable — no user session required on GET /v1/shared/{token}.

// CREATE TABLE users (
//     id            TEXT PRIMARY KEY,          -- uuid
//     user          TEXT NOT NULL UNIQUE,
//     hash          TEXT NOT NULL,
//     created_at    TEXT NOT NULL DEFAULT (datetime('now'))
//   );

// CREATE TABLE sessions (
//     id         TEXT PRIMARY KEY,             -- random session id (not user id)
//     user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//     expires_at TEXT NOT NULL,
//     created_at TEXT NOT NULL DEFAULT (datetime('now'))
//   );
  

// CREATE TABLE games (
//     id         TEXT PRIMARY KEY,
//     owner_id   TEXT NOT NULL REFERENCES users(id),
//     json        TEXT NOT NULL,                  -- JSON as TEXT (or BLOB)
//     updated_at TEXT NOT NULL,
//     etag       TEXT NOT NULL                   -- for optimistic concurrency
//   );