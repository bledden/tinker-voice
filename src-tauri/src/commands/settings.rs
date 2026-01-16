//! Settings commands for API key management
//!
//! SESSION 2: Implement these commands

use tauri::State;
use crate::state::AppState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeysStatus {
    pub elevenlabs: ApiKeyStatus,
    pub anthropic: ApiKeyStatus,
    pub tonic: ApiKeyStatus,
    pub yutori: ApiKeyStatus,
    pub tinker: ApiKeyStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyStatus {
    pub is_configured: bool,
    pub is_valid: Option<bool>,
    pub last_checked: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ApiService {
    Elevenlabs,
    Anthropic,
    Tonic,
    Yutori,
    Tinker,
}

/// Get status of all API keys
#[tauri::command]
pub async fn get_api_keys_status(state: State<'_, AppState>) -> Result<ApiKeysStatus, String> {
    let elevenlabs = state.elevenlabs.lock().await;
    let anthropic = state.anthropic.lock().await;
    let tonic = state.tonic.lock().await;
    let yutori = state.yutori.lock().await;
    let tinker = state.tinker.lock().await;

    Ok(ApiKeysStatus {
        elevenlabs: ApiKeyStatus {
            is_configured: elevenlabs.has_api_key(),
            is_valid: None,
            last_checked: None,
        },
        anthropic: ApiKeyStatus {
            is_configured: anthropic.has_api_key(),
            is_valid: None,
            last_checked: None,
        },
        tonic: ApiKeyStatus {
            is_configured: tonic.has_api_key(),
            is_valid: None,
            last_checked: None,
        },
        yutori: ApiKeyStatus {
            is_configured: yutori.has_api_key(),
            is_valid: None,
            last_checked: None,
        },
        tinker: ApiKeyStatus {
            is_configured: tinker.has_api_key(),
            is_valid: None,
            last_checked: None,
        },
    })
}

/// Set an API key
#[tauri::command]
pub async fn set_api_key(
    state: State<'_, AppState>,
    service: String,
    api_key: String,
) -> Result<bool, String> {
    match service.to_lowercase().as_str() {
        "elevenlabs" => {
            let mut client = state.elevenlabs.lock().await;
            client.set_api_key(api_key);
        }
        "anthropic" => {
            let mut client = state.anthropic.lock().await;
            client.set_api_key(api_key);
        }
        "tonic" => {
            let mut client = state.tonic.lock().await;
            client.set_api_key(api_key);
        }
        "yutori" => {
            let mut client = state.yutori.lock().await;
            client.set_api_key(api_key);
        }
        "tinker" => {
            let mut client = state.tinker.lock().await;
            client.set_api_key(api_key);
        }
        _ => return Err(format!("Unknown service: {}", service)),
    }

    Ok(true)
}

/// Test an API connection
#[tauri::command]
pub async fn test_api_connection(
    state: State<'_, AppState>,
    service: String,
) -> Result<bool, String> {
    // Check if API key is configured
    let has_key = match service.to_lowercase().as_str() {
        "elevenlabs" => {
            let client = state.elevenlabs.lock().await;
            client.has_api_key()
        }
        "anthropic" => {
            let client = state.anthropic.lock().await;
            client.has_api_key()
        }
        "tonic" => {
            let client = state.tonic.lock().await;
            client.has_api_key()
        }
        "yutori" => {
            let client = state.yutori.lock().await;
            client.has_api_key()
        }
        "tinker" => {
            let client = state.tinker.lock().await;
            client.has_api_key()
        }
        _ => return Err(format!("Unknown service: {}", service)),
    };

    // For hackathon: just return whether the key is configured
    // TODO: Implement actual connection testing later
    Ok(has_key)
}
