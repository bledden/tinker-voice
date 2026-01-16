//! Training commands for Tinker API integration
//!
//! SESSION 2: Implement these commands

use tauri::State;
use crate::state::AppState;
use crate::api::tinker::{
    TrainingConfig, TrainingRun, TrainingType, Hyperparameters, LoraConfig,
    TrainingStatus, TrainingProgress,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTrainingRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub model: String,
    pub training_type: String,
    pub dataset_id: String,
    pub hyperparameters: HyperparametersInput,
    pub lora_config: Option<LoraConfigInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperparametersInput {
    pub learning_rate: f64,
    pub batch_size: u32,
    pub num_epochs: u32,
    pub max_steps: Option<u32>,
    pub warmup_steps: Option<u32>,
    pub weight_decay: Option<f64>,
    pub gradient_accumulation_steps: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoraConfigInput {
    pub rank: u32,
    pub alpha: f32,
    pub dropout: f32,
    pub target_modules: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingRunResponse {
    pub id: String,
    pub name: Option<String>,
    pub status: String,
    pub model: String,
    pub training_type: String,
    pub created_at: String,
    pub progress: Option<TrainingProgressResponse>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingProgressResponse {
    pub current_step: u32,
    pub total_steps: u32,
    pub current_epoch: u32,
    pub total_epochs: u32,
    pub loss: Option<f64>,
    pub eta_seconds: Option<u64>,
    pub percent_complete: f32,
}

impl From<TrainingRun> for TrainingRunResponse {
    fn from(run: TrainingRun) -> Self {
        Self {
            id: run.id,
            name: run.name,
            status: format!("{:?}", run.status).to_lowercase(),
            model: run.model,
            training_type: format!("{:?}", run.training_type).to_lowercase(),
            created_at: run.created_at.to_rfc3339(),
            progress: run.progress.map(|p| TrainingProgressResponse {
                current_step: p.current_step,
                total_steps: p.total_steps,
                current_epoch: p.current_epoch,
                total_epochs: p.total_epochs,
                loss: p.loss,
                eta_seconds: p.eta_seconds,
                percent_complete: if p.total_steps > 0 {
                    (p.current_step as f32 / p.total_steps as f32) * 100.0
                } else {
                    0.0
                },
            }),
            error: run.error,
        }
    }
}

/// Create a new training run
#[tauri::command]
pub async fn create_training_run(
    state: State<'_, AppState>,
    request: CreateTrainingRequest,
) -> Result<TrainingRunResponse, String> {
    let client = state.tinker.lock().await;

    let training_type = match request.training_type.to_lowercase().as_str() {
        "sft" => TrainingType::Sft,
        "rl" => TrainingType::Rl,
        "grpo" => TrainingType::Grpo,
        "ppo" => TrainingType::Ppo,
        "dpo" => TrainingType::Dpo,
        "gkd" => TrainingType::Gkd,
        _ => return Err(format!("Unknown training type: {}", request.training_type)),
    };

    let config = TrainingConfig {
        model: request.model,
        training_type,
        dataset_path: request.dataset_id, // In real impl, this would be a path/URL
        hyperparameters: Hyperparameters {
            learning_rate: request.hyperparameters.learning_rate,
            batch_size: request.hyperparameters.batch_size,
            num_epochs: request.hyperparameters.num_epochs,
            max_steps: request.hyperparameters.max_steps,
            warmup_steps: request.hyperparameters.warmup_steps,
            weight_decay: request.hyperparameters.weight_decay,
            gradient_accumulation_steps: request.hyperparameters.gradient_accumulation_steps,
        },
        lora_config: request.lora_config.map(|l| LoraConfig {
            rank: l.rank,
            alpha: l.alpha,
            dropout: l.dropout,
            target_modules: l.target_modules.unwrap_or_else(|| {
                vec!["q_proj".to_string(), "v_proj".to_string()]
            }),
        }),
        name: request.name,
        description: request.description,
    };

    let run = client
        .create_training_run(config)
        .await
        .map_err(|e| e.to_string())?;

    Ok(run.into())
}

/// Get a training run by ID
#[tauri::command]
pub async fn get_training_run(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<TrainingRunResponse, String> {
    let client = state.tinker.lock().await;

    let run = client
        .get_training_run(&run_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(run.into())
}

/// List all training runs
#[tauri::command]
pub async fn list_training_runs(
    state: State<'_, AppState>,
    page: Option<u32>,
    per_page: Option<u32>,
) -> Result<Vec<TrainingRunResponse>, String> {
    let client = state.tinker.lock().await;

    let response = client
        .list_training_runs(page, per_page)
        .await
        .map_err(|e| e.to_string())?;

    Ok(response.runs.into_iter().map(|r| r.into()).collect())
}

/// Get training status (shorthand for get_training_run)
#[tauri::command]
pub async fn get_training_status(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<TrainingRunResponse, String> {
    get_training_run(state, run_id).await
}

/// Cancel a training run
#[tauri::command]
pub async fn cancel_training_run(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<TrainingRunResponse, String> {
    let client = state.tinker.lock().await;

    let run = client
        .cancel_training_run(&run_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(run.into())
}
