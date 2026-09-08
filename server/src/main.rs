mod dao;

use dao::{activate_game, get_active_game, get_game, get_games, new_game, save_game};
use sqlx_sqlite::SqlitePoolOptions;
use sqlx_sqlite::SqliteConnectOptions;
use sqlx_sqlite::SqliteJournalMode;
use tokio::{signal, task::AbortHandle};
use std::str::FromStr;
use std::time::Duration;
use tower_sessions::{session_store::ExpiredDeletion, Expiry, SessionManagerLayer};
use tower_sessions_sqlx_store::SqliteStore;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::{HeaderValue, Method, header},
    routing::{get, post},
};
use tower_http::cors::CorsLayer;
.
const MAX_BODY_BYTES: usize = 1024 * 1024;
const DEFAULT_DEV_BIND: &str = "0.0.0.0";
const DEFAULT_PROD_BIND: &str = "127.0.0.1";
const DEFAULT_DEV_CORS_ORIGIN: &str = "http://localhost:5173";

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let app_env = std::env::var("APP_ENV").unwrap_or_else(|_| "dev".to_string());
    let is_prod = app_env.eq_ignore_ascii_case("prod");

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let opts: SqliteConnectOptions = SqliteConnectOptions::from_str(&db_url)
        .expect("DATABASE_URL is not a valid sqlite URL")
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(Duration::from_secs(5));
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(opts)
        .await
        .expect("failed to connect sqlite pool");

    let session_store = SqliteStore::new(pool.clone());
    session_store.migrate().await.expect("session store migrate");
    let deletion_task = tokio::task::spawn(
        session_store
            .clone()
            .continuously_delete_expired(Duration::from_secs(60)),
    );
    // continuesly clean up games?

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3000);

    // Same pattern as CORS_ORIGINS: env override, else APP_ENV default.
    let bind_host = std::env::var("BIND_ADDR").unwrap_or_else(|_| {
        if is_prod {
            DEFAULT_PROD_BIND.to_string()
        } else {
            DEFAULT_DEV_BIND.to_string()
        }
    });

    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(is_prod)
        .with_expiry(Expiry::OnInactivity(time::Duration::days(7)));

    let mut app = Router::new()
        .route("/games/save", post(save_game))
        .route("/games/new", post(new_game))
        .route("/games", get(get_games))
        .route("/games/{id}", get(get_game))
        .route("/games/{id}/activate", post(activate_game))
        .route("/games/active", get(get_active_game))
        .layer(DefaultBodyLimit::max(MAX_BODY_BYTES))
        .layer(session_layer)
        .with_state(pool);

    if let Some(cors) = build_cors_layer(is_prod) {
        app = app.layer(cors);
    }

    let addr = format!("{bind_host}:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    eprintln!("games API listening on http://{addr} (APP_ENV={app_env}, secure_cookies={is_prod})");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal(deletion_task.abort_handle()))
        .await
        .unwrap();

    deletion_task.await.unwrap().unwrap();
}

fn build_cors_layer(is_prod: bool) -> Option<CorsLayer> {
    let origins_env = std::env::var("CORS_ORIGINS").ok();
    let origins: Vec<HeaderValue> = match origins_env.as_deref() {
        Some(raw) if raw.trim().is_empty() => Vec::new(),
        Some(raw) => raw
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| {
                HeaderValue::from_str(s).unwrap_or_else(|_| {
                    panic!("invalid CORS_ORIGINS entry: {s:?}");
                })
            })
            .collect(),
        None if is_prod => Vec::new(),
        None => vec![HeaderValue::from_static(DEFAULT_DEV_CORS_ORIGIN)],
    };

    if origins.is_empty() {
        return None;
    }
    Some(
        CorsLayer::new()
            .allow_origin(origins)
            .allow_credentials(true)
            .allow_methods([Method::GET, Method::POST])
            .allow_headers([header::CONTENT_TYPE]),
    )
}

async fn shutdown_signal(deletion_task_abort_handle: AbortHandle) {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => { deletion_task_abort_handle.abort() },
        _ = terminate => { deletion_task_abort_handle.abort() },
    }
}
