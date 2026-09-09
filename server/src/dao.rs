use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use axum_anyhow::{ApiError, ApiResult, OptionExt};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tower_sessions::Session;

const USER_ID: &str = "user_id";

#[derive(sqlx::FromRow, serde::Serialize)]
pub struct GameRow {
    id: i64,
    owner_id: Option<String>,
    name: String,
    json: String,
    updated_at: String,
    created_at: String,
}

#[derive(sqlx::FromRow, serde::Serialize)]
pub struct GameDetail {
    id: i64,
    owner_id: Option<String>,
    name: String,
    updated_at: String,
    created_at: String,
}

#[derive(Deserialize, Serialize)]
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

async fn require_user_id(session: &Session) -> ApiResult<String> {
    session
        .get::<String>(USER_ID)
        .await?
        .ok_or_else(|| {
            ApiError::builder()
                .status(StatusCode::UNAUTHORIZED)
                .title("Please log in to save the game")
                .build()
        })
}

async fn insert_owned_game(
    pool: &SqlitePool,
    owner_id: &str,
    name: &str,
    json: &str,
) -> Result<i64, sqlx::Error> {
    let id = sqlx::query!(
        r#"
INSERT INTO games ( owner_id, name, json, updated_at, created_at )
VALUES ( ?1, ?2, ?3, strftime('%s', 'now'), strftime('%s', 'now') )
        "#,
        owner_id,
        name,
        json
    )
    .execute(pool)
    .await?
    .last_insert_rowid();
    Ok(id)
}

async fn update_owned_game(
    pool: &SqlitePool,
    id: i64,
    owner_id: &str,
    name: &str,
    json: &str,
) -> Result<u64, sqlx::Error> {
    let result = sqlx::query!(
        r#"
UPDATE games
SET name = ?1, json = ?2, updated_at = strftime('%s', 'now')
WHERE id = ?3 AND owner_id = ?4
        "#,
        name,
        json,
        id,
        owner_id
    )
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}

pub async fn save_game(
    State(pool): State<SqlitePool>,
    session: Session,
    Query(query): Query<SaveGameQuery>,
    Json(game_log): Json<GameLog>,
) -> ApiResult<Json<i64>> {
    let user_id = require_user_id(&session).await?;
    let name = &game_log.meta.title;
    let json = serde_json::to_string(&game_log)?;

    if let Some(game_id) = query.id {
        let game = game_by_id(&pool, game_id).await?;
        match &game.owner_id {
            Some(owner_id) if owner_id == &user_id => {}
            Some(_) => {
                return Err(ApiError::builder()
                    .status(StatusCode::FORBIDDEN)
                    .title("You are not the author of this game")
                    .build());
            }
            None => {
                return Err(ApiError::builder()
                    .status(StatusCode::FORBIDDEN)
                    .title("Game has no owner")
                    .build());
            }
        }

        let rows = update_owned_game(&pool, game_id, &user_id, name, &json).await?;
        if rows == 0 {
            return Err(ApiError::builder()
                .status(StatusCode::NOT_FOUND)
                .title("Game not found")
                .build());
        }
        return Ok(Json(game_id));
    }

    let id = insert_owned_game(&pool, &user_id, name, &json).await?;
    Ok(Json(id))
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

#[derive(Serialize)]
pub struct GameResponse {
    id: i64,
    doc: serde_json::Value,
    can_edit: bool,
}

fn session_can_edit(user_id: &Option<String>, owner_id: &Option<String>) -> bool {
    match (user_id, owner_id) {
        (Some(uid), Some(oid)) => uid == oid,
        _ => false,
    }
}

#[axum::debug_handler]
pub async fn get_games(State(pool): State<SqlitePool>) -> ApiResult<Json<Vec<GameDetail>>> {
    let games: Vec<GameDetail> = sqlx::query_as!(
        GameDetail,
        r#"
SELECT id, owner_id, name, updated_at, created_at FROM games
WHERE owner_id IS NOT NULL
ORDER BY updated_at DESC
        "#,
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(games))
}

pub async fn get_game(
    State(pool): State<SqlitePool>,
    session: Session,
    Path(id): Path<i64>,
) -> ApiResult<Json<GameResponse>> {
    let game = game_by_id(&pool, id).await?;
    let user_id = session.get::<String>(USER_ID).await?;
    let doc: serde_json::Value = serde_json::from_str(&game.json)?;
    Ok(Json(GameResponse {
        id: game.id,
        doc,
        can_edit: session_can_edit(&user_id, &game.owner_id),
    }))
}
