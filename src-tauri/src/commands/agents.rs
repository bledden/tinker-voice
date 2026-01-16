//! Agent commands for Claude integration
//!
//! SESSION 2: Implement these commands

use tauri::State;
use crate::state::AppState;
use crate::api::anthropic::AgentType;
use serde::{Deserialize, Serialize};

// ============ Intent Parsing ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingIntent {
    /// What the user wants to accomplish
    pub task_description: String,
    /// Domain/industry context
    pub domain: String,
    /// Desired model behavior/tone
    pub style: Option<String>,
    /// Suggested model size
    pub suggested_model: Option<String>,
    /// Suggested training type
    pub suggested_training_type: Option<String>,
    /// Whether user wants synthetic data
    pub needs_synthetic_data: bool,
    /// Estimated number of examples needed
    pub suggested_example_count: Option<u32>,
    /// Any constraints mentioned
    pub constraints: Vec<String>,
    /// Confidence in interpretation (0-1)
    pub confidence: f32,
}

/// Parse user intent from voice transcript
#[tauri::command]
pub async fn parse_intent(
    state: State<'_, AppState>,
    transcript: String,
) -> Result<TrainingIntent, String> {
    let client = state.anthropic.lock().await;

    let response = client
        .chat_with_agent(AgentType::Intent, &transcript)
        .await
        .map_err(|e| e.to_string())?;

    // TODO: Parse the response into TrainingIntent
    // For now, return a placeholder
    Ok(TrainingIntent {
        task_description: transcript.clone(),
        domain: "general".to_string(),
        style: None,
        suggested_model: Some("llama-3-8b".to_string()),
        suggested_training_type: Some("sft".to_string()),
        needs_synthetic_data: true,
        suggested_example_count: Some(1000),
        constraints: vec![],
        confidence: 0.8,
    })
}

// ============ Data Validation ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    /// Overall quality score (0-100)
    pub quality_score: u32,
    /// Is the data good enough to proceed?
    pub is_acceptable: bool,
    /// Issues found
    pub issues: Vec<ValidationIssue>,
    /// Suggestions for improvement
    pub suggestions: Vec<String>,
    /// Sample analysis
    pub sample_analysis: Vec<SampleAnalysis>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationIssue {
    pub severity: IssueSeverity,
    pub category: String,
    pub description: String,
    pub affected_count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IssueSeverity {
    Error,
    Warning,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SampleAnalysis {
    pub index: u32,
    pub input_preview: String,
    pub output_preview: String,
    pub feedback: String,
}

/// Validate dataset quality using Claude
#[tauri::command]
pub async fn validate_data(
    state: State<'_, AppState>,
    data_json: String,
    intent: TrainingIntent,
) -> Result<ValidationReport, String> {
    let client = state.anthropic.lock().await;

    let prompt = format!(
        "Validate this training data for the task: {}\n\nData:\n{}",
        intent.task_description, data_json
    );

    let response = client
        .chat_with_agent(AgentType::Validation, &prompt)
        .await
        .map_err(|e| e.to_string())?;

    // TODO: Parse the response into ValidationReport
    // For now, return a placeholder
    Ok(ValidationReport {
        quality_score: 85,
        is_acceptable: true,
        issues: vec![],
        suggestions: vec!["Consider adding more diverse examples".to_string()],
        sample_analysis: vec![],
    })
}

// ============ Config Recommendation ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigRecommendation {
    /// Recommended model
    pub model: String,
    /// Recommended training type
    pub training_type: String,
    /// Recommended hyperparameters
    pub hyperparameters: RecommendedHyperparameters,
    /// LoRA configuration if applicable
    pub lora_config: Option<RecommendedLoraConfig>,
    /// Estimated cost
    pub estimated_cost: f64,
    /// Estimated training time (minutes)
    pub estimated_time_minutes: u32,
    /// Rationale for recommendations
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendedHyperparameters {
    pub learning_rate: f64,
    pub batch_size: u32,
    pub num_epochs: u32,
    pub warmup_steps: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendedLoraConfig {
    pub rank: u32,
    pub alpha: f32,
    pub dropout: f32,
}

/// Recommend training configuration based on intent and data
#[tauri::command]
pub async fn recommend_config(
    state: State<'_, AppState>,
    intent: TrainingIntent,
    data_stats: DataStats,
) -> Result<ConfigRecommendation, String> {
    let client = state.anthropic.lock().await;

    let prompt = format!(
        "Recommend training config for:\nTask: {}\nData samples: {}\nAvg tokens: {}",
        intent.task_description, data_stats.num_samples, data_stats.avg_tokens_per_sample
    );

    let response = client
        .chat_with_agent(AgentType::Config, &prompt)
        .await
        .map_err(|e| e.to_string())?;

    // TODO: Parse the response into ConfigRecommendation
    // For now, return a placeholder
    Ok(ConfigRecommendation {
        model: intent.suggested_model.unwrap_or("llama-3-8b".to_string()),
        training_type: intent.suggested_training_type.unwrap_or("sft".to_string()),
        hyperparameters: RecommendedHyperparameters {
            learning_rate: 1e-5,
            batch_size: 8,
            num_epochs: 3,
            warmup_steps: 100,
        },
        lora_config: Some(RecommendedLoraConfig {
            rank: 16,
            alpha: 32.0,
            dropout: 0.1,
        }),
        estimated_cost: 15.0,
        estimated_time_minutes: 90,
        rationale: "Standard configuration for instruction fine-tuning".to_string(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataStats {
    pub num_samples: u32,
    pub avg_tokens_per_sample: u32,
    pub max_tokens: u32,
    pub min_tokens: u32,
}

// ============ General Chat ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub message: String,
    pub should_speak: bool,
}

/// General chat with Claude agent
#[tauri::command]
pub async fn chat_with_agent(
    state: State<'_, AppState>,
    message: String,
    agent_type: Option<String>,
) -> Result<ChatResponse, String> {
    let client = state.anthropic.lock().await;

    let agent = match agent_type.as_deref() {
        Some("intent") => AgentType::Intent,
        Some("validation") => AgentType::Validation,
        Some("config") => AgentType::Config,
        _ => AgentType::General,
    };

    let response = client
        .chat_with_agent(agent, &message)
        .await
        .map_err(|e| e.to_string())?;

    Ok(ChatResponse {
        message: response.content,
        should_speak: true,
    })
}
