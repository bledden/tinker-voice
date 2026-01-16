//! Yutori API client for web research
//!
//! API Documentation: https://docs.yutori.com/
//!
//! Endpoints:
//! - POST /v1/research - Deep web research
//! - GET /v1/research/{id} - Get research status/results

use reqwest::Client;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

const BASE_URL: &str = "https://api.yutori.com";

#[derive(Error, Debug)]
pub enum YutoriError {
    #[error("API key not configured")]
    NoApiKey,
    #[error("Request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Research failed: {0}")]
    ResearchFailed(String),
    #[error("API error: {status} - {message}")]
    ApiError { status: u16, message: String },
    #[error("Research still in progress")]
    InProgress { research_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchRequest {
    /// The research query/topic
    pub query: String,
    /// How deep to research (1-5, where 5 is most thorough)
    pub depth: u8,
    /// Optional domain focus (e.g., "machine learning", "customer service")
    pub domain: Option<String>,
    /// Maximum number of sources to consult
    pub max_sources: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchResult {
    /// Synthesized research findings
    pub summary: String,
    /// Key insights extracted
    pub insights: Vec<String>,
    /// Sources used
    pub sources: Vec<Source>,
    /// Raw findings for further processing
    pub raw_findings: Vec<Finding>,
    /// Research metadata
    pub metadata: ResearchMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub url: String,
    pub title: String,
    pub relevance_score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub content: String,
    pub source_url: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchMetadata {
    pub research_id: String,
    pub duration_ms: u64,
    pub sources_consulted: u32,
    pub status: ResearchStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ResearchStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

/// Research for ML training best practices
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MLResearchResult {
    /// Recommended hyperparameters
    pub recommended_params: Vec<ParameterRecommendation>,
    /// Best practices for this type of task
    pub best_practices: Vec<String>,
    /// Example prompts/data patterns
    pub data_patterns: Vec<String>,
    /// Potential pitfalls to avoid
    pub pitfalls: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterRecommendation {
    pub name: String,
    pub value: String,
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize)]
struct ApiResearchRequest {
    query: String,
    depth: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    domain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_sources: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
struct ApiResearchResponse {
    research_id: String,
    status: ResearchStatus,
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    insights: Vec<String>,
    #[serde(default)]
    sources: Vec<Source>,
    #[serde(default)]
    findings: Vec<Finding>,
    #[serde(default)]
    duration_ms: u64,
    #[serde(default)]
    sources_consulted: u32,
}

pub struct YutoriClient {
    client: Client,
    api_key: Option<String>,
    base_url: String,
}

impl YutoriClient {
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

    fn get_api_key(&self) -> Result<&str, YutoriError> {
        self.api_key.as_deref().ok_or(YutoriError::NoApiKey)
    }

    /// Start a research task (returns immediately with research_id)
    pub async fn start_research(&self, request: ResearchRequest) -> Result<String, YutoriError> {
        let api_key = self.get_api_key()?;

        let api_request = ApiResearchRequest {
            query: request.query,
            depth: request.depth.clamp(1, 5),
            domain: request.domain,
            max_sources: request.max_sources,
        };

        let response = self
            .client
            .post(format!("{}/v1/research", self.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&api_request)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(YutoriError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        let api_response: ApiResearchResponse = response
            .json()
            .await
            .map_err(|e| YutoriError::InvalidResponse(e.to_string()))?;

        Ok(api_response.research_id)
    }

    /// Get research results (poll until complete)
    pub async fn get_research(&self, research_id: &str) -> Result<ResearchResult, YutoriError> {
        let api_key = self.get_api_key()?;

        let response = self
            .client
            .get(format!("{}/v1/research/{}", self.base_url, research_id))
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(YutoriError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        let api_response: ApiResearchResponse = response
            .json()
            .await
            .map_err(|e| YutoriError::InvalidResponse(e.to_string()))?;

        match api_response.status {
            ResearchStatus::Completed => Ok(ResearchResult {
                summary: api_response.summary.unwrap_or_default(),
                insights: api_response.insights,
                sources: api_response.sources,
                raw_findings: api_response.findings,
                metadata: ResearchMetadata {
                    research_id: api_response.research_id,
                    duration_ms: api_response.duration_ms,
                    sources_consulted: api_response.sources_consulted,
                    status: ResearchStatus::Completed,
                },
            }),
            ResearchStatus::Failed => Err(YutoriError::ResearchFailed(
                api_response.summary.unwrap_or_else(|| "Research failed".to_string()),
            )),
            _ => Err(YutoriError::InProgress {
                research_id: api_response.research_id,
            }),
        }
    }

    /// Perform deep web research on a topic (blocking - waits for completion)
    pub async fn research(&self, request: ResearchRequest) -> Result<ResearchResult, YutoriError> {
        let research_id = self.start_research(request).await?;

        // Poll for results with exponential backoff
        let mut delay_ms = 1000u64;
        let max_delay_ms = 10000u64;
        let max_attempts = 60; // Max ~10 minutes of polling

        for _ in 0..max_attempts {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;

            match self.get_research(&research_id).await {
                Ok(result) => return Ok(result),
                Err(YutoriError::InProgress { .. }) => {
                    delay_ms = (delay_ms * 2).min(max_delay_ms);
                    continue;
                }
                Err(e) => return Err(e),
            }
        }

        Err(YutoriError::ResearchFailed(
            "Research timed out".to_string(),
        ))
    }

    /// Research ML training best practices for a specific task
    pub async fn research_ml_task(
        &self,
        task_description: &str,
        model_type: &str,
        training_type: &str,
    ) -> Result<MLResearchResult, YutoriError> {
        let query = format!(
            "Best practices and recommended hyperparameters for {} fine-tuning {} models. \
            Task: {}. \
            Include: learning rates, batch sizes, LoRA configurations, common pitfalls, \
            data formatting patterns, and evaluation strategies.",
            training_type, model_type, task_description
        );

        let request = ResearchRequest {
            query,
            depth: 4,
            domain: Some("machine learning fine-tuning".to_string()),
            max_sources: Some(20),
        };

        let result = self.research(request).await?;

        // Parse the research results into structured ML recommendations
        // This is a simplified parsing - in production, you'd use Claude to structure this
        let ml_result = MLResearchResult {
            recommended_params: result
                .insights
                .iter()
                .filter(|i| i.contains("rate") || i.contains("batch") || i.contains("rank"))
                .take(5)
                .map(|insight| ParameterRecommendation {
                    name: extract_param_name(insight),
                    value: extract_param_value(insight),
                    rationale: insight.clone(),
                })
                .collect(),
            best_practices: result
                .insights
                .iter()
                .filter(|i| i.contains("should") || i.contains("best") || i.contains("recommend"))
                .cloned()
                .collect(),
            data_patterns: result
                .insights
                .iter()
                .filter(|i| i.contains("format") || i.contains("data") || i.contains("example"))
                .cloned()
                .collect(),
            pitfalls: result
                .insights
                .iter()
                .filter(|i| i.contains("avoid") || i.contains("don't") || i.contains("warning"))
                .cloned()
                .collect(),
        };

        Ok(ml_result)
    }

    /// Test API connection
    pub async fn test_connection(&self) -> Result<bool, YutoriError> {
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

/// Helper to extract parameter name from insight text
fn extract_param_name(insight: &str) -> String {
    if insight.to_lowercase().contains("learning rate") {
        "learning_rate".to_string()
    } else if insight.to_lowercase().contains("batch size") {
        "batch_size".to_string()
    } else if insight.to_lowercase().contains("lora rank") || insight.to_lowercase().contains("rank") {
        "lora_rank".to_string()
    } else if insight.to_lowercase().contains("epoch") {
        "num_epochs".to_string()
    } else {
        "parameter".to_string()
    }
}

/// Helper to extract parameter value from insight text
fn extract_param_value(insight: &str) -> String {
    // Simple regex-like extraction - look for numbers
    let words: Vec<&str> = insight.split_whitespace().collect();
    for word in words {
        let cleaned = word.trim_matches(|c: char| !c.is_numeric() && c != '.' && c != '-' && c != 'e');
        if !cleaned.is_empty() && cleaned.chars().next().map(|c| c.is_numeric()).unwrap_or(false) {
            return cleaned.to_string();
        }
    }
    "unknown".to_string()
}

impl Default for YutoriClient {
    fn default() -> Self {
        Self::new(None)
    }
}
