//! Tinker API client for ML model fine-tuning
//!
//! Based on the existing tinker-desktop implementation.
//! API Base: https://api.thinkingmachines.ai

use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use thiserror::Error;

const BASE_URL: &str = "https://api.thinkingmachines.ai";

#[derive(Error, Debug)]
pub enum TinkerError {
    #[error("API key not configured")]
    NoApiKey,
    #[error("Request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Training failed: {0}")]
    TrainingFailed(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Unauthorized")]
    Unauthorized,
    #[error("API error: {status} - {message}")]
    ApiError { status: u16, message: String },
}

// ============ Training Configuration Types ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingConfig {
    pub model: String,
    pub training_type: TrainingType,
    pub dataset_path: String,
    pub hyperparameters: Hyperparameters,
    pub lora_config: Option<LoraConfig>,
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TrainingType {
    Sft,
    Rl,
    Grpo,
    Ppo,
    Dpo,
    Gkd,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hyperparameters {
    pub learning_rate: f64,
    pub batch_size: u32,
    pub num_epochs: u32,
    pub max_steps: Option<u32>,
    pub warmup_steps: Option<u32>,
    pub weight_decay: Option<f64>,
    pub gradient_accumulation_steps: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoraConfig {
    pub rank: u32,
    pub alpha: f32,
    pub dropout: f32,
    pub target_modules: Vec<String>,
}

// ============ Training Run Types ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingRun {
    pub id: String,
    pub name: Option<String>,
    pub status: TrainingStatus,
    pub model: String,
    pub training_type: TrainingType,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub progress: Option<TrainingProgress>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TrainingStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingProgress {
    pub current_step: u32,
    pub total_steps: u32,
    pub current_epoch: u32,
    pub total_epochs: u32,
    pub loss: Option<f64>,
    pub eta_seconds: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListTrainingRunsResponse {
    pub runs: Vec<TrainingRun>,
    pub total: u32,
    pub page: u32,
    pub per_page: u32,
}

// ============ Checkpoint Types ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkpoint {
    pub id: String,
    pub run_id: String,
    pub step: u32,
    pub path: String,
    pub size_bytes: u64,
    pub created_at: DateTime<Utc>,
    pub metrics: Option<CheckpointMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckpointMetrics {
    pub loss: f64,
    pub eval_loss: Option<f64>,
    pub accuracy: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListCheckpointsResponse {
    pub checkpoints: Vec<Checkpoint>,
    pub total: u32,
    pub page: u32,
    pub per_page: u32,
}

// ============ Model Information ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub parameters: String,
    pub supported_training_types: Vec<TrainingType>,
    pub max_lora_rank: u32,
    pub price_per_million_tokens: f64,
}

// ============ API Request/Response Types ============

#[derive(Debug, Clone, Serialize)]
struct CreateRunRequest {
    name: Option<String>,
    model: String,
    training_type: TrainingType,
    dataset_path: String,
    hyperparameters: Hyperparameters,
    #[serde(skip_serializing_if = "Option::is_none")]
    lora_config: Option<LoraConfig>,
}

#[derive(Debug, Clone, Deserialize)]
struct ApiError {
    message: String,
    #[serde(default)]
    code: Option<String>,
}

pub struct TinkerClient {
    client: Client,
    api_key: Option<String>,
    base_url: String,
}

impl TinkerClient {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: BASE_URL.to_string(),
        }
    }

    pub fn set_api_key(&mut self, api_key: String) {
        self.api_key = Some(api_key);
    }

    pub fn has_api_key(&self) -> bool {
        self.api_key.is_some()
    }

    fn get_api_key(&self) -> Result<&str, TinkerError> {
        self.api_key.as_deref().ok_or(TinkerError::NoApiKey)
    }

    fn auth_header(&self) -> Result<String, TinkerError> {
        Ok(format!("Bearer {}", self.get_api_key()?))
    }

    /// Create a new training run
    pub async fn create_training_run(
        &self,
        config: TrainingConfig,
    ) -> Result<TrainingRun, TinkerError> {
        let request = CreateRunRequest {
            name: config.name,
            model: config.model,
            training_type: config.training_type,
            dataset_path: config.dataset_path,
            hyperparameters: config.hyperparameters,
            lora_config: config.lora_config,
        };

        let response = self
            .client
            .post(format!("{}/v1/training/runs", self.base_url))
            .header("Authorization", self.auth_header()?)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        let status = response.status();

        if status == 401 {
            return Err(TinkerError::Unauthorized);
        }

        if !status.is_success() {
            let error: ApiError = response
                .json()
                .await
                .unwrap_or(ApiError {
                    message: "Unknown error".to_string(),
                    code: None,
                });
            return Err(TinkerError::ApiError {
                status: status.as_u16(),
                message: error.message,
            });
        }

        let run: TrainingRun = response
            .json()
            .await
            .map_err(|e| TinkerError::InvalidResponse(e.to_string()))?;

        Ok(run)
    }

    /// Get a training run by ID
    pub async fn get_training_run(&self, run_id: &str) -> Result<TrainingRun, TinkerError> {
        let response = self
            .client
            .get(format!("{}/v1/training/runs/{}", self.base_url, run_id))
            .header("Authorization", self.auth_header()?)
            .send()
            .await?;

        let status = response.status();

        if status == 401 {
            return Err(TinkerError::Unauthorized);
        }

        if status == 404 {
            return Err(TinkerError::NotFound(run_id.to_string()));
        }

        if !status.is_success() {
            let error: ApiError = response
                .json()
                .await
                .unwrap_or(ApiError {
                    message: "Unknown error".to_string(),
                    code: None,
                });
            return Err(TinkerError::ApiError {
                status: status.as_u16(),
                message: error.message,
            });
        }

        let run: TrainingRun = response
            .json()
            .await
            .map_err(|e| TinkerError::InvalidResponse(e.to_string()))?;

        Ok(run)
    }

    /// List training runs with pagination
    pub async fn list_training_runs(
        &self,
        page: Option<u32>,
        per_page: Option<u32>,
    ) -> Result<ListTrainingRunsResponse, TinkerError> {
        let mut url = format!("{}/v1/training/runs", self.base_url);

        let page = page.unwrap_or(1);
        let per_page = per_page.unwrap_or(10);
        url = format!("{}?page={}&per_page={}", url, page, per_page);

        let response = self
            .client
            .get(&url)
            .header("Authorization", self.auth_header()?)
            .send()
            .await?;

        let status = response.status();

        if status == 401 {
            return Err(TinkerError::Unauthorized);
        }

        if !status.is_success() {
            let error: ApiError = response
                .json()
                .await
                .unwrap_or(ApiError {
                    message: "Unknown error".to_string(),
                    code: None,
                });
            return Err(TinkerError::ApiError {
                status: status.as_u16(),
                message: error.message,
            });
        }

        let list: ListTrainingRunsResponse = response
            .json()
            .await
            .map_err(|e| TinkerError::InvalidResponse(e.to_string()))?;

        Ok(list)
    }

    /// Cancel a training run
    pub async fn cancel_training_run(&self, run_id: &str) -> Result<TrainingRun, TinkerError> {
        let response = self
            .client
            .post(format!(
                "{}/v1/training/runs/{}/cancel",
                self.base_url, run_id
            ))
            .header("Authorization", self.auth_header()?)
            .send()
            .await?;

        let status = response.status();

        if status == 401 {
            return Err(TinkerError::Unauthorized);
        }

        if status == 404 {
            return Err(TinkerError::NotFound(run_id.to_string()));
        }

        if !status.is_success() {
            let error: ApiError = response
                .json()
                .await
                .unwrap_or(ApiError {
                    message: "Unknown error".to_string(),
                    code: None,
                });
            return Err(TinkerError::ApiError {
                status: status.as_u16(),
                message: error.message,
            });
        }

        let run: TrainingRun = response
            .json()
            .await
            .map_err(|e| TinkerError::InvalidResponse(e.to_string()))?;

        Ok(run)
    }

    /// List checkpoints for a training run
    pub async fn list_checkpoints(
        &self,
        run_id: &str,
        page: Option<u32>,
        per_page: Option<u32>,
    ) -> Result<ListCheckpointsResponse, TinkerError> {
        let page = page.unwrap_or(1);
        let per_page = per_page.unwrap_or(10);

        let response = self
            .client
            .get(format!(
                "{}/v1/training/runs/{}/checkpoints?page={}&per_page={}",
                self.base_url, run_id, page, per_page
            ))
            .header("Authorization", self.auth_header()?)
            .send()
            .await?;

        let status = response.status();

        if status == 401 {
            return Err(TinkerError::Unauthorized);
        }

        if status == 404 {
            return Err(TinkerError::NotFound(run_id.to_string()));
        }

        if !status.is_success() {
            let error: ApiError = response
                .json()
                .await
                .unwrap_or(ApiError {
                    message: "Unknown error".to_string(),
                    code: None,
                });
            return Err(TinkerError::ApiError {
                status: status.as_u16(),
                message: error.message,
            });
        }

        let list: ListCheckpointsResponse = response
            .json()
            .await
            .map_err(|e| TinkerError::InvalidResponse(e.to_string()))?;

        Ok(list)
    }

    /// Get a specific checkpoint
    pub async fn get_checkpoint(
        &self,
        run_id: &str,
        checkpoint_id: &str,
    ) -> Result<Checkpoint, TinkerError> {
        let response = self
            .client
            .get(format!(
                "{}/v1/training/runs/{}/checkpoints/{}",
                self.base_url, run_id, checkpoint_id
            ))
            .header("Authorization", self.auth_header()?)
            .send()
            .await?;

        let status = response.status();

        if status == 401 {
            return Err(TinkerError::Unauthorized);
        }

        if status == 404 {
            return Err(TinkerError::NotFound(checkpoint_id.to_string()));
        }

        if !status.is_success() {
            let error: ApiError = response
                .json()
                .await
                .unwrap_or(ApiError {
                    message: "Unknown error".to_string(),
                    code: None,
                });
            return Err(TinkerError::ApiError {
                status: status.as_u16(),
                message: error.message,
            });
        }

        let checkpoint: Checkpoint = response
            .json()
            .await
            .map_err(|e| TinkerError::InvalidResponse(e.to_string()))?;

        Ok(checkpoint)
    }

    /// Get available models
    pub async fn get_models(&self) -> Result<Vec<ModelInfo>, TinkerError> {
        let response = self
            .client
            .get(format!("{}/v1/models", self.base_url))
            .header("Authorization", self.auth_header()?)
            .send()
            .await?;

        let status = response.status();

        if status == 401 {
            return Err(TinkerError::Unauthorized);
        }

        if !status.is_success() {
            let error: ApiError = response
                .json()
                .await
                .unwrap_or(ApiError {
                    message: "Unknown error".to_string(),
                    code: None,
                });
            return Err(TinkerError::ApiError {
                status: status.as_u16(),
                message: error.message,
            });
        }

        let models: Vec<ModelInfo> = response
            .json()
            .await
            .map_err(|e| TinkerError::InvalidResponse(e.to_string()))?;

        Ok(models)
    }

    /// Upload a dataset file
    pub async fn upload_dataset(
        &self,
        file_data: Vec<u8>,
        filename: &str,
    ) -> Result<DatasetUploadResponse, TinkerError> {
        let part = reqwest::multipart::Part::bytes(file_data)
            .file_name(filename.to_string())
            .mime_str("application/octet-stream")
            .map_err(|e| TinkerError::InvalidResponse(e.to_string()))?;

        let form = reqwest::multipart::Form::new().part("file", part);

        let response = self
            .client
            .post(format!("{}/v1/datasets/upload", self.base_url))
            .header("Authorization", self.auth_header()?)
            .multipart(form)
            .send()
            .await?;

        let status = response.status();

        if status == 401 {
            return Err(TinkerError::Unauthorized);
        }

        if !status.is_success() {
            let error: ApiError = response
                .json()
                .await
                .unwrap_or(ApiError {
                    message: "Unknown error".to_string(),
                    code: None,
                });
            return Err(TinkerError::ApiError {
                status: status.as_u16(),
                message: error.message,
            });
        }

        let upload_response: DatasetUploadResponse = response
            .json()
            .await
            .map_err(|e| TinkerError::InvalidResponse(e.to_string()))?;

        Ok(upload_response)
    }

    /// Test API connection
    pub async fn test_connection(&self) -> Result<bool, TinkerError> {
        let response = self
            .client
            .get(format!("{}/v1/health", self.base_url))
            .header("Authorization", self.auth_header()?)
            .send()
            .await?;

        if response.status() == 401 {
            return Err(TinkerError::Unauthorized);
        }

        Ok(response.status().is_success())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatasetUploadResponse {
    pub dataset_id: String,
    pub path: String,
    pub size_bytes: u64,
    pub row_count: u32,
}

impl Default for TinkerClient {
    fn default() -> Self {
        Self::new(None)
    }
}
