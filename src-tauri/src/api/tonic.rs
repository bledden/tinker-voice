//! Tonic Fabricate API client for synthetic data generation
//!
//! API Documentation: https://www.tonic.ai/fabricate
//!
//! Endpoints:
//! - POST /generate - Generate synthetic data from prompt/schema

use reqwest::Client;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

const BASE_URL: &str = "https://api.tonic.ai";

#[derive(Error, Debug)]
pub enum TonicError {
    #[error("API key not configured")]
    NoApiKey,
    #[error("Request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Generation failed: {0}")]
    GenerationFailed(String),
    #[error("API error: {status} - {message}")]
    ApiError { status: u16, message: String },
    #[error("JSON parsing error: {0}")]
    JsonError(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationRequest {
    /// Natural language description of data to generate
    pub prompt: String,
    /// Number of records to generate
    pub num_records: u32,
    /// Optional schema to follow
    pub schema: Option<DataSchema>,
    /// Output format
    pub format: OutputFormat,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSchema {
    pub fields: Vec<FieldDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    pub name: String,
    pub field_type: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    #[default]
    Jsonl,
    Csv,
    Json,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationResult {
    /// Generated data as string (JSONL, CSV, or JSON)
    pub data: String,
    /// Number of records generated
    pub record_count: u32,
    /// Generation metadata
    pub metadata: GenerationMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationMetadata {
    pub generation_id: String,
    pub duration_ms: u64,
    pub prompt_used: String,
}

/// Training data format for fine-tuning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingExample {
    /// The input/prompt
    pub input: String,
    /// The expected output/completion
    pub output: String,
    /// Optional system prompt
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct ApiGenerationRequest {
    prompt: String,
    num_records: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    schema: Option<DataSchema>,
    output_format: String,
}

#[derive(Debug, Clone, Deserialize)]
struct ApiGenerationResponse {
    data: String,
    record_count: u32,
    generation_id: String,
    duration_ms: u64,
}

pub struct TonicClient {
    client: Client,
    api_key: Option<String>,
    base_url: String,
}

impl TonicClient {
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

    fn get_api_key(&self) -> Result<&str, TonicError> {
        self.api_key.as_deref().ok_or(TonicError::NoApiKey)
    }

    /// Generate synthetic data from a natural language prompt
    pub async fn generate(&self, request: GenerationRequest) -> Result<GenerationResult, TonicError> {
        let api_key = self.get_api_key()?;

        let format_str = match request.format {
            OutputFormat::Jsonl => "jsonl",
            OutputFormat::Csv => "csv",
            OutputFormat::Json => "json",
        };

        let api_request = ApiGenerationRequest {
            prompt: request.prompt.clone(),
            num_records: request.num_records,
            schema: request.schema,
            output_format: format_str.to_string(),
        };

        let response = self
            .client
            .post(format!("{}/v1/fabricate/generate", self.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&api_request)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(TonicError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        let api_response: ApiGenerationResponse = response
            .json()
            .await
            .map_err(|e| TonicError::InvalidResponse(e.to_string()))?;

        Ok(GenerationResult {
            data: api_response.data,
            record_count: api_response.record_count,
            metadata: GenerationMetadata {
                generation_id: api_response.generation_id,
                duration_ms: api_response.duration_ms,
                prompt_used: request.prompt,
            },
        })
    }

    /// Generate training data specifically for ML fine-tuning
    pub async fn generate_training_data(
        &self,
        task_description: &str,
        domain: &str,
        num_examples: u32,
        style_hints: Option<&str>,
    ) -> Result<Vec<TrainingExample>, TonicError> {
        let prompt = format!(
            r#"Generate {} high-quality training examples for fine-tuning a language model.

Task: {}
Domain: {}
{}

Each example should have:
- "input": The user query or prompt
- "output": The ideal assistant response
- "system": Optional system prompt (include if relevant)

Generate diverse, realistic examples that cover edge cases and common scenarios.
Format as JSONL (one JSON object per line)."#,
            num_examples,
            task_description,
            domain,
            style_hints.map(|s| format!("Style: {}", s)).unwrap_or_default()
        );

        let request = GenerationRequest {
            prompt,
            num_records: num_examples,
            schema: Some(DataSchema {
                fields: vec![
                    FieldDefinition {
                        name: "input".to_string(),
                        field_type: "string".to_string(),
                        description: Some("User input or query".to_string()),
                    },
                    FieldDefinition {
                        name: "output".to_string(),
                        field_type: "string".to_string(),
                        description: Some("Ideal assistant response".to_string()),
                    },
                    FieldDefinition {
                        name: "system".to_string(),
                        field_type: "string".to_string(),
                        description: Some("Optional system prompt".to_string()),
                    },
                ],
            }),
            format: OutputFormat::Jsonl,
        };

        let result = self.generate(request).await?;

        // Parse JSONL data into TrainingExamples
        let examples: Vec<TrainingExample> = result
            .data
            .lines()
            .filter(|line| !line.trim().is_empty())
            .map(|line| serde_json::from_str(line))
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| TonicError::InvalidResponse(format!("Failed to parse training examples: {}", e)))?;

        Ok(examples)
    }

    /// Preview generation without full execution (for cost estimation)
    pub async fn preview_generation(
        &self,
        prompt: &str,
        num_records: u32,
    ) -> Result<GenerationPreview, TonicError> {
        let api_key = self.get_api_key()?;

        let request = serde_json::json!({
            "prompt": prompt,
            "num_records": num_records,
            "preview_only": true
        });

        let response = self
            .client
            .post(format!("{}/v1/fabricate/preview", self.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(TonicError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        let preview: GenerationPreview = response
            .json()
            .await
            .map_err(|e| TonicError::InvalidResponse(e.to_string()))?;

        Ok(preview)
    }

    /// Test API connection
    pub async fn test_connection(&self) -> Result<bool, TonicError> {
        let api_key = self.get_api_key()?;

        let response = self
            .client
            .get(format!("{}/v1/health", self.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await?;

        Ok(response.status().is_success())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationPreview {
    pub estimated_tokens: u32,
    pub estimated_cost: f64,
    pub estimated_duration_seconds: u32,
    pub schema_inferred: Option<DataSchema>,
}

impl Default for TonicClient {
    fn default() -> Self {
        Self::new(None)
    }
}
