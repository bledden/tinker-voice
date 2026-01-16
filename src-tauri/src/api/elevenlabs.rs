//! ElevenLabs API client for text-to-speech and speech-to-text
//!
//! API Documentation: https://elevenlabs.io/docs/api-reference
//!
//! Endpoints:
//! - POST /v1/text-to-speech/{voice_id}/stream - Convert text to speech
//! - POST /v1/speech-to-text - Transcribe audio to text

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use thiserror::Error;

const BASE_URL: &str = "https://api.elevenlabs.io";
const DEFAULT_VOICE_ID: &str = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

#[derive(Error, Debug)]
pub enum ElevenLabsError {
    #[error("API key not configured")]
    NoApiKey,
    #[error("Request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("API error: {status} - {message}")]
    ApiError { status: u16, message: String },
    #[error("Base64 decode error: {0}")]
    Base64Error(#[from] base64::DecodeError),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub confidence: Option<f32>,
    pub language_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeechResult {
    pub audio_base64: String,
    pub content_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceSettings {
    #[serde(default = "default_stability")]
    pub stability: f32,
    #[serde(default = "default_similarity_boost")]
    pub similarity_boost: f32,
    #[serde(default)]
    pub style: f32,
    #[serde(default)]
    pub use_speaker_boost: bool,
}

fn default_stability() -> f32 {
    0.5
}

fn default_similarity_boost() -> f32 {
    0.75
}

impl Default for VoiceSettings {
    fn default() -> Self {
        Self {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
struct TextToSpeechRequest {
    text: String,
    model_id: String,
    voice_settings: VoiceSettings,
}

#[derive(Debug, Clone, Deserialize)]
struct ApiErrorResponse {
    detail: Option<ApiErrorDetail>,
}

#[derive(Debug, Clone, Deserialize)]
struct ApiErrorDetail {
    message: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct TranscriptionResponse {
    text: String,
    #[serde(default)]
    confidence: Option<f32>,
    #[serde(default)]
    language_code: Option<String>,
}

pub struct ElevenLabsClient {
    client: Client,
    api_key: Option<String>,
    base_url: String,
    default_voice_id: String,
    default_model_id: String,
}

impl ElevenLabsClient {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: BASE_URL.to_string(),
            default_voice_id: DEFAULT_VOICE_ID.to_string(),
            default_model_id: "eleven_multilingual_v2".to_string(),
        }
    }

    pub fn set_api_key(&mut self, api_key: String) {
        self.api_key = Some(api_key);
    }

    pub fn has_api_key(&self) -> bool {
        self.api_key.is_some()
    }

    fn get_api_key(&self) -> Result<&str, ElevenLabsError> {
        self.api_key.as_deref().ok_or(ElevenLabsError::NoApiKey)
    }

    /// Transcribe audio to text using ElevenLabs Speech-to-Text API
    pub async fn transcribe(&self, audio_base64: &str) -> Result<TranscriptionResult, ElevenLabsError> {
        let api_key = self.get_api_key()?;

        // Decode base64 audio data
        let audio_bytes = BASE64.decode(audio_base64)?;

        // Create multipart form with audio file
        let part = reqwest::multipart::Part::bytes(audio_bytes)
            .file_name("audio.webm")
            .mime_str("audio/webm")
            .map_err(|e| ElevenLabsError::InvalidResponse(e.to_string()))?;

        let form = reqwest::multipart::Form::new()
            .part("audio", part)
            .text("model_id", "scribe_v1");

        let response = self
            .client
            .post(format!("{}/v1/speech-to-text", self.base_url))
            .header("xi-api-key", api_key)
            .multipart(form)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(ElevenLabsError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        let transcription: TranscriptionResponse = response
            .json()
            .await
            .map_err(|e| ElevenLabsError::InvalidResponse(e.to_string()))?;

        Ok(TranscriptionResult {
            text: transcription.text,
            confidence: transcription.confidence,
            language_code: transcription.language_code,
        })
    }

    /// Convert text to speech using ElevenLabs TTS API
    pub async fn text_to_speech(
        &self,
        text: &str,
        voice_id: Option<&str>,
        voice_settings: Option<VoiceSettings>,
    ) -> Result<SpeechResult, ElevenLabsError> {
        let api_key = self.get_api_key()?;
        let voice = voice_id.unwrap_or(&self.default_voice_id);
        let settings = voice_settings.unwrap_or_default();

        let request = TextToSpeechRequest {
            text: text.to_string(),
            model_id: self.default_model_id.clone(),
            voice_settings: settings,
        };

        let response = self
            .client
            .post(format!(
                "{}/v1/text-to-speech/{}/stream",
                self.base_url, voice
            ))
            .header("xi-api-key", api_key)
            .header("Accept", "audio/mpeg")
            .json(&request)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(ElevenLabsError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        let content_type = response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("audio/mpeg")
            .to_string();

        let audio_bytes = response.bytes().await?;
        let audio_base64 = BASE64.encode(&audio_bytes);

        Ok(SpeechResult {
            audio_base64,
            content_type,
        })
    }

    /// Test API connection by fetching user info
    pub async fn test_connection(&self) -> Result<bool, ElevenLabsError> {
        let api_key = self.get_api_key()?;

        let response = self
            .client
            .get(format!("{}/v1/user", self.base_url))
            .header("xi-api-key", api_key)
            .send()
            .await?;

        Ok(response.status().is_success())
    }

    /// List available voices
    pub async fn list_voices(&self) -> Result<Vec<Voice>, ElevenLabsError> {
        let api_key = self.get_api_key()?;

        let response = self
            .client
            .get(format!("{}/v1/voices", self.base_url))
            .header("xi-api-key", api_key)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(ElevenLabsError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        let voices_response: VoicesResponse = response
            .json()
            .await
            .map_err(|e| ElevenLabsError::InvalidResponse(e.to_string()))?;

        Ok(voices_response.voices)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Voice {
    pub voice_id: String,
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub labels: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Clone, Deserialize)]
struct VoicesResponse {
    voices: Vec<Voice>,
}

impl Default for ElevenLabsClient {
    fn default() -> Self {
        Self::new(None)
    }
}
