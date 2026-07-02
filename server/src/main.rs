mod dao;

use dao::{save_game, get_games, get_game};

// use argon2::{
//     password_hash::{PassswordHash, PasswordHasher, PasswordVerifier, SaltString},
//     Argon2,
// }
// use rand::rngs::OsRng;

// use axum_extra::extract::cookie::{Cookie, SameSite};

use axum::{
    Router,
    routing::{get, post},
};
use axum::http::{header, Method};
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    std::env::var("DATABASE_URL").expect("DATABASE_URL must be set (see .env.example)");

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3000);

    let cors = CorsLayer::new()
        .allow_origin(Any)//TODO remove after sesssion/users
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/games/save", post(save_game))
        .route("/games", get(get_games))
        .route("/games/{id}", get(get_game))
        .layer(cors);

    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    eprintln!("games API listening on http://{addr}");
    axum::serve(listener, app).await.unwrap();

    // let cookie = Cookie::build(("session_id", session_id))
    // .http_only(true)      // JS cannot read it
    // .secure(true)         // HTTPS only
    // .same_site(SameSite::Lax)  // or Strict; Lax is friendlier for top-level nav
    // .path("/")
    // .max_age(time::Duration::days(14))
    // .build();
    
}
// fn register(user: &str, psw: &str) -> anyhow::Result<()> {
//     let hash = hash_password(psw)?;
//     match get_user(user) {
//         Ok(_) => {
//             return Err(anyhow::anyhow!("User already exists"));
//         }
//         Err(_) => {
//             save_user(user, hash)?;
//         }
//     }
//     Ok(Json(user))
// }

// fn hash_password(plain: &str) -> anyhow::Result<String> {
//     let salt = SaltString::generate(&mut OsRng);
//     let hash = Argon2::default().hash_password(plain.as_bytes(), &salt)?.to_string();
//     Ok(hash)
// }

// fn verify_password(plain: &str, store: &str) -> anyhow::Result<bool> {
//     let parsed = PasswordHash::new(store)?;
//     Ok(Argon2::default().verify_password(plain.as_bytes(), &parsed).is_ok())
// }
// fn login() -> anyhow::Result<()> {
//     Ok(Json(user))
// }

// use tower_http::cors::{Any, CorsLayer};
// use http::{header, Method};
// // Cookie-based auth (browser):
// CorsLayer::new()
//     .allow_origin(["http://localhost:5173".parse().unwrap()])
//     .allow_credentials(true)
//     .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
//     .allow_headers([header::CONTENT_TYPE, header::IF_MATCH]);
// // Public read-only catalogs (no credentials):
// CorsLayer::new()
//     .allow_origin(Any)
//     .allow_methods([Method::GET]);