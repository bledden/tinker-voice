//! Anthropic Claude API client for agent reasoning
//!
//! API Documentation: https://docs.anthropic.com/en/api
//!
//! Endpoints:
//! - POST /v1/messages - Chat completions

use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

const BASE_URL: &str = "https://api.anthropic.com";
const API_VERSION: &str = "2023-06-01";
const DEFAULT_MODEL: &str = "claude-sonnet-4-20250514";

#[derive(Error, Debug)]
pub enum AnthropicError {
    #[error("API key not configured")]
    NoApiKey,
    #[error("Request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("API error: {error_type} - {message}")]
    ApiError { error_type: String, message: String },
    #[error("Rate limited")]
    RateLimited,
    #[error("JSON parsing error: {0}")]
    JsonError(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String, // "user" or "assistant"
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub messages: Vec<Message>,
    pub system: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub stop_reason: Option<String>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

/// Agent types for different reasoning tasks
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentType {
    Intent,      // Parse user intent from voice
    Validation,  // Validate synthetic data quality
    Config,      // Recommend training configuration
    General,     // General conversation
}

impl AgentType {
    /// Get the embedded system prompt for this agent type
    pub fn system_prompt(&self) -> &'static str {
        match self {
            AgentType::Intent => INTENT_AGENT_PROMPT,
            AgentType::Validation => VALIDATION_AGENT_PROMPT,
            AgentType::Config => CONFIG_AGENT_PROMPT,
            AgentType::General => GENERAL_AGENT_PROMPT,
        }
    }
}

// Embedded system prompts for each agent type
const INTENT_AGENT_PROMPT: &str = r#"You are an intent parser for TinkerVoice, a voice-controlled ML fine-tuning application.

Parse natural language commands and extract structured intent information.

Always respond with valid JSON in this format:
{
  "intent": "generate_data" | "start_training" | "check_status" | "configure" | "research" | "help" | "unknown",
  "entities": {
    "domain": "optional domain/topic",
    "count": "optional number of samples",
    "model": "optional model name",
    "dataset": "optional dataset reference"
  },
  "confidence": 0.0-1.0,
  "clarification_needed": "optional question if intent is unclear"
}

Examples:
- "Generate 1000 samples for customer support" -> intent: generate_data, entities: {domain: "customer support", count: 1000}
- "Train a model on my data" -> intent: start_training
- "How's my training going?" -> intent: check_status"#;

const VALIDATION_AGENT_PROMPT: &str = r#"You are a data quality validator for ML training datasets.

Analyze the provided data samples and check for:
1. Format consistency (proper JSON/JSONL structure)
2. Field completeness (required fields present)
3. Content quality (no empty strings, reasonable lengths)
4. Potential issues (duplicates, encoding problems, PII)

Always respond with valid JSON in this format:
{
  "valid": true/false,
  "issues": [
    {"severity": "error" | "warning" | "info", "message": "description", "location": "optional location"}
  ],
  "stats": {
    "total_samples": number,
    "valid_samples": number,
    "fields_found": ["field1", "field2"]
  },
  "recommendations": ["suggestion 1", "suggestion 2"]
}"#;

const CONFIG_AGENT_PROMPT: &str = r#"You are an ML training configuration expert for TinkerVoice.

Based on requirements and dataset characteristics, recommend optimal training configurations.

Consider:
- Dataset size and domain
- Base model selection
- LoRA parameters (rank, target modules)
- Training hyperparameters (learning rate, batch size, steps)
- Training type (SFT, DPO, RLHF)

Always respond with valid JSON in this format:
{
  "recommended_config": {
    "base_model": "model-id",
    "training_type": "sft" | "dpo" | "rl",
    "lora": {"rank": number, "train_mlp": bool, "train_attn": bool},
    "hyperparameters": {"learning_rate": number, "batch_size": number, "steps": number}
  },
  "reasoning": "explanation of choices",
  "alternatives": [{"config": {...}, "tradeoff": "description"}],
  "warnings": ["any concerns or limitations"]
}"#;

const GENERAL_AGENT_PROMPT: &str = r#"You are TinkerVoice, a helpful voice assistant for ML fine-tuning.

You help users:
- Generate synthetic training data
- Configure and start training runs
- Monitor training progress
- Research domains for data generation

Be concise and helpful. When users ask about capabilities, guide them through the workflow."#;

#[derive(Debug, Clone, Serialize)]
struct MessagesRequest {
    model: String,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    messages: Vec<ApiMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ApiMessage {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Deserialize)]
struct MessagesResponse {
    content: Vec<ContentBlock>,
    stop_reason: Option<String>,
    usage: ApiUsage,
}

#[derive(Debug, Clone, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct ApiUsage {
    input_tokens: u32,
    output_tokens: u32,
}

#[derive(Debug, Clone, Deserialize)]
struct ApiErrorResponse {
    #[serde(rename = "type")]
    error_type: String,
    error: ApiErrorDetail,
}

#[derive(Debug, Clone, Deserialize)]
struct ApiErrorDetail {
    #[serde(rename = "type")]
    error_type: String,
    message: String,
}

// Structured response types for agent outputs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedIntent {
    pub intent: String,
    pub entities: Value,
    pub confidence: f32,
    pub clarification_needed: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub issues: Vec<ValidationIssue>,
    pub stats: Value,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationIssue {
    pub severity: String,
    pub message: String,
    pub location: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigRecommendation {
    pub recommended_config: Value,
    pub reasoning: String,
    pub alternatives: Vec<Value>,
    pub warnings: Vec<String>,
}

pub struct AnthropicClient {
    client: Client,
    api_key: Option<String>,
    base_url: String,
    model: String,
}

impl AnthropicClient {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: BASE_URL.to_string(),
            model: DEFAULT_MODEL.to_string(),
        }
    }

    pub fn set_api_key(&mut self, api_key: String) {
        self.api_key = Some(api_key);
    }

    pub fn has_api_key(&self) -> bool {
        self.api_key.is_some()
    }

    fn get_api_key(&self) -> Result<&str, AnthropicError> {
        self.api_key.as_deref().ok_or(AnthropicError::NoApiKey)
    }

    /// Send a chat message to Claude
    pub async fn chat(&self, request: ChatRequest) -> Result<ChatResponse, AnthropicError> {
        let api_key = self.get_api_key()?;

        let api_request = MessagesRequest {
            model: self.model.clone(),
            max_tokens: request.max_tokens.unwrap_or(4096),
            system: request.system,
            messages: request
                .messages
                .into_iter()
                .map(|m| ApiMessage {
                    role: m.role,
                    content: m.content,
                })
                .collect(),
            temperature: request.temperature,
        };

        let response = self
            .client
            .post(format!("{}/v1/messages", self.base_url))
            .header("x-api-key", api_key)
            .header("anthropic-version", API_VERSION)
            .header("content-type", "application/json")
            .json(&api_request)
            .send()
            .await?;

        let status = response.status();

        if status == 429 {
            return Err(AnthropicError::RateLimited);
        }

        if !status.is_success() {
            let error_response: ApiErrorResponse = response
                .json()
                .await
                .map_err(|e| AnthropicError::InvalidResponse(e.to_string()))?;
            return Err(AnthropicError::ApiError {
                error_type: error_response.error.error_type,
                message: error_response.error.message,
            });
        }

        let messages_response: MessagesResponse = response
            .json()
            .await
            .map_err(|e| AnthropicError::InvalidResponse(e.to_string()))?;

        let content = messages_response
            .content
            .iter()
            .filter_map(|block| block.text.as_ref())
            .cloned()
            .collect::<Vec<_>>()
            .join("");

        Ok(ChatResponse {
            content,
            stop_reason: messages_response.stop_reason,
            usage: Some(Usage {
                input_tokens: messages_response.usage.input_tokens,
                output_tokens: messages_response.usage.output_tokens,
            }),
        })
    }

    /// Chat with a specific agent type (uses embedded system prompt)
    pub async fn chat_with_agent(
        &self,
        agent: AgentType,
        user_message: &str,
    ) -> Result<ChatResponse, AnthropicError> {
        let request = ChatRequest {
            messages: vec![Message {
                role: "user".to_string(),
                content: user_message.to_string(),
            }],
            system: Some(agent.system_prompt().to_string()),
            max_tokens: Some(4096),
            temperature: Some(0.3), // Lower temperature for more consistent structured output
        };

        self.chat(request).await
    }

    /// Parse user intent from natural language
    pub async fn parse_intent(&self, user_input: &str) -> Result<ParsedIntent, AnthropicError> {
        let response = self.chat_with_agent(AgentType::Intent, user_input).await?;
        let json_str = extract_json(&response.content)?;
        let parsed: ParsedIntent = serde_json::from_str(&json_str)?;
        Ok(parsed)
    }

    /// Validate data samples
    pub async fn validate_data(&self, data_samples: &str) -> Result<ValidationResult, AnthropicError> {
        let prompt = format!(
            "Please validate the following data samples:\n\n```\n{}\n```",
            data_samples
        );
        let response = self.chat_with_agent(AgentType::Validation, &prompt).await?;
        let json_str = extract_json(&response.content)?;
        let result: ValidationResult = serde_json::from_str(&json_str)?;
        Ok(result)
    }

    /// Get configuration recommendations
    pub async fn recommend_config(
        &self,
        requirements: &str,
        dataset_info: Option<&str>,
    ) -> Result<ConfigRecommendation, AnthropicError> {
        let prompt = if let Some(info) = dataset_info {
            format!(
                "Requirements: {}\n\nDataset information:\n{}",
                requirements, info
            )
        } else {
            format!("Requirements: {}", requirements)
        };

        let response = self.chat_with_agent(AgentType::Config, &prompt).await?;
        let json_str = extract_json(&response.content)?;
        let result: ConfigRecommendation = serde_json::from_str(&json_str)?;
        Ok(result)
    }

    /// Test API connection
    pub async fn test_connection(&self) -> Result<bool, AnthropicError> {
        let api_key = self.get_api_key()?;

        let request = MessagesRequest {
            model: self.model.clone(),
            max_tokens: 10,
            system: None,
            messages: vec![ApiMessage {
                role: "user".to_string(),
                content: "Hi".to_string(),
            }],
            temperature: None,
        };

        let response = self
            .client
            .post(format!("{}/v1/messages", self.base_url))
            .header("x-api-key", api_key)
            .header("anthropic-version", API_VERSION)
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await?;

        Ok(response.status().is_success())
    }
}

/// Extract JSON from a response that may contain markdown code blocks
fn extract_json(content: &str) -> Result<String, AnthropicError> {
    // Try to find JSON in code blocks first
    if let Some(start) = content.find("```json") {
        let json_start = start + 7;
        if let Some(end) = content[json_start..].find("```") {
            return Ok(content[json_start..json_start + end].trim().to_string());
        }
    }

    // Try plain code blocks
    if let Some(start) = content.find("```") {
        let json_start = start + 3;
        let json_start = content[json_start..]
            .find('\n')
            .map(|i| json_start + i + 1)
            .unwrap_or(json_start);
        if let Some(end) = content[json_start..].find("```") {
            return Ok(content[json_start..json_start + end].trim().to_string());
        }
    }

    // Try to find raw JSON object or array
    if let Some(start) = content.find('{') {
        if let Some(end) = content.rfind('}') {
            return Ok(content[start..=end].to_string());
        }
    }

    if let Some(start) = content.find('[') {
        if let Some(end) = content.rfind(']') {
            return Ok(content[start..=end].to_string());
        }
    }

    Err(AnthropicError::InvalidResponse(
        "Could not extract JSON from response".to_string(),
    ))
}

impl Default for AnthropicClient {
    fn default() -> Self {
        Self::new(None)
    }
}
