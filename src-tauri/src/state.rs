use tokio::sync::Mutex;

use crate::api::{
    anthropic::AnthropicClient,
    elevenlabs::ElevenLabsClient,
    tinker::TinkerClient,
    tonic::TonicClient,
    yutori::YutoriClient,
};

/// Shared application state accessible from all Tauri commands
pub struct AppState {
    pub elevenlabs: Mutex<ElevenLabsClient>,
    pub anthropic: Mutex<AnthropicClient>,
    pub tonic: Mutex<TonicClient>,
    pub yutori: Mutex<YutoriClient>,
    pub tinker: Mutex<TinkerClient>,
}

impl AppState {
    pub fn new() -> Self {
        // Load API keys from environment variables
        let elevenlabs_key = std::env::var("ELEVENLABS_API_KEY").ok();
        let anthropic_key = std::env::var("ANTHROPIC_API_KEY").ok();
        let tonic_key = std::env::var("TONIC_API_KEY").ok();
        let yutori_key = std::env::var("YUTORI_API_KEY").ok();
        let tinker_key = std::env::var("TINKER_API_KEY").ok();

        Self {
            elevenlabs: Mutex::new(ElevenLabsClient::new(elevenlabs_key)),
            anthropic: Mutex::new(AnthropicClient::new(anthropic_key)),
            tonic: Mutex::new(TonicClient::new(tonic_key)),
            yutori: Mutex::new(YutoriClient::new(yutori_key)),
            tinker: Mutex::new(TinkerClient::new(tinker_key)),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
