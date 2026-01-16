//! Voice commands for ElevenLabs integration

use crate::api::elevenlabs::{Voice, VoiceSettings};
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResponse {
    pub text: String,
    pub confidence: Option<f32>,
    pub language_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpeechResponse {
    pub audio_base64: String,
    pub content_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceStatus {
    pub is_configured: bool,
    pub default_voice_id: String,
}

/// Transcribe audio to text
#[tauri::command]
pub async fn transcribe_audio(
    state: State<'_, AppState>,
    audio_base64: String,
) -> Result<TranscriptionResponse, String> {
    let client = state.elevenlabs.lock().await;

    let result = client
        .transcribe(&audio_base64)
        .await
        .map_err(|e| e.to_string())?;

    Ok(TranscriptionResponse {
        text: result.text,
        confidence: result.confidence,
        language_code: result.language_code,
    })
}

/// Convert text to speech
#[tauri::command]
pub async fn text_to_speech(
    state: State<'_, AppState>,
    text: String,
    voice_id: Option<String>,
    voice_settings: Option<VoiceSettings>,
) -> Result<SpeechResponse, String> {
    let client = state.elevenlabs.lock().await;

    let result = client
        .text_to_speech(&text, voice_id.as_deref(), voice_settings)
        .await
        .map_err(|e| e.to_string())?;

    Ok(SpeechResponse {
        audio_base64: result.audio_base64,
        content_type: result.content_type,
    })
}

/// Get voice configuration status
#[tauri::command]
pub async fn get_voice_status(state: State<'_, AppState>) -> Result<VoiceStatus, String> {
    let client = state.elevenlabs.lock().await;

    Ok(VoiceStatus {
        is_configured: client.has_api_key(),
        default_voice_id: "21m00Tcm4TlvDq8ikWAM".to_string(),
    })
}

/// List available voices
#[tauri::command]
pub async fn list_voices(state: State<'_, AppState>) -> Result<Vec<Voice>, String> {
    let client = state.elevenlabs.lock().await;

    client.list_voices().await.map_err(|e| e.to_string())
}
