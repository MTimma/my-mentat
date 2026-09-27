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
    owner_id: String,
    name: String,
    summary: sqlx::types::Json<GameSummary>,
    content: sqlx::types::Json<GameContent>,
    version: i64,
    updated_at: String,
    created_at: String,
}

#[derive(sqlx::FromRow, Serialize)]
pub struct GameListEntry {
    id: i64,
    owner_id: String,
    name: String,
    summary: sqlx::types::Json<GameSummary>,
    updated_at: String,
    created_at: String,
}

#[derive(Deserialize, Serialize, sqlx::FromRow)]
pub struct GameContent {
    schemaVersion: i32,
    meta: GameMeta,
    setup: serde_json::Value,
    events: serde_json::Value,
    branches: serde_json::Value,
    cursor: serde_json::Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    summary: Option<sqlx::types::Json<GameSummary>>,
}

fn summary_for_persist(log: &GameContent) -> sqlx::types::Json<GameSummary> {
    log.summary
        .clone()
        .unwrap_or_else(|| sqlx::types::Json(default_summary_placeholder()))
}

fn default_summary_placeholder() -> GameSummary {
    GameSummary {
        gamePackId: "official/base".to_string(),
        rounds: 1,
        turns: 0,
        players: vec![],
    }
}

#[derive(Deserialize, Serialize)]
pub struct GameMeta {
    id: String,
    title: String,
    createdAt: String,
    updatedAt: String,
}

#[derive(Clone, Deserialize, Serialize, sqlx::FromRow)]
pub struct GameSummary {
    gamePackId: String,
    rounds: i32,
    turns: i32,
    players: Vec<GameSummaryPlayer>,
}

#[derive(Deserialize, Serialize, sqlx::FromRow)]
pub struct GameSummaryPlayer {
    id: i32,
    name: String,
    leaderId: String,
    color: String,
    vp: i32,
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
    content: &sqlx::types::Json<GameContent>,
    summary: &sqlx::types::Json<GameSummary>,
) -> Result<i64, sqlx::Error> {
    let id = sqlx::query!(
        r#"
INSERT INTO games ( owner_id, name, content, summary, updated_at, created_at )
VALUES ( ?1, ?2, jsonb(?3), jsonb(?4), strftime('%s', 'now'), strftime('%s', 'now') )
        "#,
        owner_id,
        name,
        content,
        summary
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
    content: &sqlx::types::Json<GameContent>,
    summary: &sqlx::types::Json<GameSummary>,
) -> Result<u64, sqlx::Error> {
    let result = sqlx::query!(
        r#"
UPDATE games
SET name = ?1, content = jsonb(?2), summary = jsonb(?3), updated_at = strftime('%s', 'now')
WHERE id = ?4 AND owner_id = ?5
        "#,
        name,
        content,
        summary,
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
    Json(game_log): Json<GameContent>,
) -> ApiResult<Json<i64>> {
    let user_id = require_user_id(&session).await?;
    let game_log = sqlx::types::Json(game_log);
    let name = &game_log.meta.title;

    if let Some(game_id) = query.id {
        let game = game_by_id(&pool, game_id).await?;
        if game.owner_id != user_id {
            return Err(ApiError::builder()
                .status(StatusCode::FORBIDDEN)
                .title("You are not the author of this game")
                .build());
        }
        // TODO update same as branching, except with same name and increment version
        let summary = summary_for_persist(&game_log.0);
        let rows = update_owned_game(&pool, game_id, &user_id, name, &game_log, &summary).await?;
        if rows == 0 {
            return Err(ApiError::builder()
                .status(StatusCode::NOT_FOUND)
                .title("Game not found")
                .build());
        }
        return Ok(Json(game_id));
    }

    let summary = summary_for_persist(&game_log.0);
    let id = insert_owned_game(&pool, &user_id, name, &game_log, &summary).await?;
    Ok(Json(id))
}

async fn game_by_id(pool: &SqlitePool, id: i64) -> ApiResult<GameRow> {
    let game = sqlx::query_as!(
        GameRow,
        r#"
SELECT id, owner_id, name,
       json(content) AS "content!: sqlx::types::Json<GameContent>",
       json(summary) AS "summary!: sqlx::types::Json<GameSummary>",
       version, updated_at, created_at
FROM games
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
    doc: sqlx::types::Json<GameContent>,
    can_edit: bool,
}

fn session_can_edit(user_id: &Option<String>, owner_id: &str) -> bool {
    matches!(user_id, Some(uid) if uid == owner_id)
}

#[axum::debug_handler]
pub async fn get_games(State(pool): State<SqlitePool>) -> ApiResult<Json<Vec<GameListEntry>>> {
    let games: Vec<GameListEntry> = sqlx::query_as!(
        GameListEntry,
        r#"
SELECT id, owner_id, name,
       json(summary) AS "summary!: sqlx::types::Json<GameSummary>",
       updated_at, created_at
FROM games
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
    let doc = game.content;
    Ok(Json(GameResponse {
        id: game.id,
        doc,
        can_edit: session_can_edit(&user_id, &game.owner_id), //TODO refactor into new game from published with new version instead of editing existing
    }))
}
