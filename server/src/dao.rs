use axum::{Json, extract::{Path, Query, State}};
use sqlx::SqlitePool;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use axum_anyhow::{ApiError, ApiResult, OptionExt};
use axum::http::StatusCode;
use tower_sessions::Session;


const ACTIVE_GAME_ID: &str = "active_game_id";
const USER_ID: &str = "user_id";
const GAMES_LIST: &str = "games_list";
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

#[derive(sqlx::FromRow)]
#[derive(serde::Serialize)]
pub struct GameDetail {
    id: i64,
    owner_id: Option<String>,
    name: String,
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


#[derive(Deserialize)]
pub struct SaveGameQuery {
    id: Option<i64>,
}

#[derive(Serialize)]
pub struct ActiveGameResponse {
    id: i64,
    doc: serde_json::Value,
    can_edit: bool,
}

#[derive(Serialize)]
pub struct ActivateGameResponse {
    id: i64,
    can_edit: bool,
}

fn session_can_edit(user_id: &Option<String>, owner_id: &Option<String>) -> bool {
    match (user_id, owner_id) {
        (_, None) => true,
        (Some(uid), Some(oid)) => uid == oid,
        (None, Some(_)) => false,
    }
}

async fn insert_game(pool: &SqlitePool, name: &str, json: &str) -> Result<i64, sqlx::Error> {
    let id = sqlx::query!(
        r#"
INSERT INTO games ( name, json, updated_at, created_at )
VALUES ( ?1, ?2, strftime('%s', 'now'), strftime('%s', 'now') )
        "#,
        name,
        json
    )
    .execute(pool)
    .await?
    .last_insert_rowid();
    Ok(id)
}


async fn update_game(pool: &SqlitePool, id: i64, name: &str, json: &str) -> Result<u64, sqlx::Error> {
    let result = sqlx::query!(
        r#"
UPDATE games
SET name = ?1, json = ?2, updated_at = strftime('%s', 'now')
WHERE id = ?3
        "#,
        name,
        json,
        id
    )
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}

pub async fn save_game(
    State(pool): State<SqlitePool>,
    session: Session,
    Query(query): Query<SaveGameQuery>,
    Json(gameLog): Json<GameLog>,
) -> ApiResult<Json<bool>> {
    // TODO validate length/sqllite injection or corruption
    let name = &gameLog.meta.title;
    let json = serde_json::to_string_pretty(&gameLog)?; //todo remove

    let query_id = query.id;
    let active_game_id = session.get::<i64>(ACTIVE_GAME_ID).await?;
    let game_id = query_id.or(active_game_id);

    if game_id.is_none() {
        let id = insert_game(&pool, name, &json).await?;
        session.insert(ACTIVE_GAME_ID, id).await?;

        return Ok(Json(true));
    }

    let game = game_by_id(&pool, game_id.unwrap()).await?;
    let user_id = session.get::<String>(USER_ID).await?;
    let _user_id = match (&user_id, &game.owner_id) {
        (Some(user_id), Some(owner_id)) => {
            if user_id != owner_id {
                return Err(ApiError::builder()
                    .status(StatusCode::FORBIDDEN)
                    .title("You are not the author of this game")
                    .build());
            }
            Option::Some(user_id)
        }
        (None, Some(_)) => {
            if game.owner_id.is_some() {
                return Err(ApiError::builder()
                    .status(StatusCode::UNAUTHORIZED)
                    .title("Please log in to save the game")
                    .build());
            }
            Option::None
        }
        (_, None) => { Option::None }
    };
    let rows = update_game(&pool, game_id.unwrap(), name, &json).await?;
    if rows == 0 {
        // TODO log::warn!("Failed to update game {game_id}: {rows}");
        return Ok(Json(false));
    }

    Ok(Json(true))
}

/// TODO use save_game instead?
pub async fn new_game(
    State(pool): State<SqlitePool>,
    session: Session,
    Json(gameLog): Json<GameLog>,
) -> ApiResult<Json<i64>> {
    let name = &gameLog.meta.title;
    let json = serde_json::to_string_pretty(&gameLog)?; //todo remove
    let id = insert_game(&pool, name, &json).await?;
    session.insert(ACTIVE_GAME_ID, id).await?;

    Ok(Json(id))
}



/// Point this browser session at an existing game without writing JSON.
pub async fn activate_game(
    State(pool): State<SqlitePool>,
    session: Session,
    Path(id): Path<i64>,
) -> ApiResult<Json<ActivateGameResponse>> {
    let game = game_by_id(&pool, id).await?;
    session.insert(ACTIVE_GAME_ID, id).await?;
    //TODO delete old active game, if no owner_id?
    let user_id = session.get::<String>(USER_ID).await?;
    Ok(Json(ActivateGameResponse {
        id,
        can_edit: session_can_edit(&user_id, &game.owner_id),
    }))
}

async fn game_by_id(pool: &SqlitePool, id: i64) -> ApiResult<GameRow> {
    let game = sqlx::query_as!(
        GameRow,
        r#"
SELECT id, owner_id, name, json, updated_at, created_at FROM games
        WHERE id = ?1"#,
        id
    )
    .fetch_optional(pool)
    .await?
    .context_not_found("Game not found")?;
    Ok(game)
}

async fn game_json_by_id(pool: &SqlitePool, id: i64) -> ApiResult<String> {
    let game = game_by_id(pool, id).await?;
    Ok(game.json)
}

pub async fn get_active_game(
    State(pool): State<SqlitePool>,
    session: Session,
) -> ApiResult<Json<ActiveGameResponse>> {
    let id = session
        .get::<i64>(ACTIVE_GAME_ID)
        .await?
        .context_not_found("No active game")?;
    let game = game_by_id(&pool, id).await?;
    let user_id = session.get::<String>(USER_ID).await?;
    let game_json = serde_json::from_str(&game.json)?;
    Ok(Json(ActiveGameResponse {
        id,
        doc: game_json,
        can_edit: session_can_edit(&user_id, &game.owner_id),
    }))
}
//todo batch or on call remove all with expired
#[allow(dead_code)]
pub async fn get_local_games(
    State(pool): State<SqlitePool>,
    session: Session,
) -> ApiResult<Json<Vec<GameRow>>> {
    let ids = session
        .get::<Vec<i64>>(GAMES_LIST)
        .await?
        .context_not_found("No active game")?;
    // TODO do not include json in response
    // TODO get only id/name, creator
    // TODO pagination
    if ids.is_empty() {
        return Ok(Json(vec![]));
    }
    let mut qb = sqlx::QueryBuilder::new(
        "SELECT id, owner_id, name, json, updated_at, created_at FROM games WHERE id IN (",
    );
    {
        let mut separated = qb.separated(',');
        for id in &ids {
            separated.push_bind(*id);
        }
    }
    qb.push(") ORDER BY updated_at DESC");
    let games = qb.build_query_as::<GameRow>().fetch_all(&pool).await?;

    Ok(Json(games))
}


#[axum::debug_handler]
pub async fn get_games(State(pool): State<SqlitePool>) -> ApiResult<Json<Vec<GameDetail>>> {
    // TODO do not include json in response
    // TODO pagination
    let games: Vec<GameDetail> = sqlx::query_as!(
        GameDetail,
        r#"
SELECT id, owner_id, name, updated_at, created_at FROM games where owner_id is not null ORDER BY updated_at DESC
        "#,
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(games))
}

pub async fn get_game(
    State(pool): State<SqlitePool>,
    Path(id): Path<i64>,
) -> ApiResult<Json<String>> {
    Ok(Json(game_json_by_id(&pool, id).await?))
}


// Debounce ~300–1000ms so undo/spam clicks don’t fire a write each time.
// Compact JSON in prod, not pretty-print.


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