//! Research commands for Yutori integration
//!
//! SESSION 2: Implement these commands

use tauri::State;
use crate::state::AppState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchRequest {
    pub task_description: String,
    pub domain: String,
    pub model_type: Option<String>,
    pub training_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchResponse {
    pub research_id: String,
    pub summary: String,
    pub best_practices: Vec<String>,
    pub data_patterns: Vec<String>,
    pub recommended_params: Vec<ParamRecommendation>,
    pub pitfalls: Vec<String>,
    pub sources: Vec<ResearchSource>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParamRecommendation {
    pub name: String,
    pub value: String,
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchSource {
    pub title: String,
    pub url: String,
    pub relevance: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchStatus {
    pub research_id: String,
    pub status: String, // "pending", "running", "completed", "failed"
    pub progress: Option<f32>,
    pub result: Option<ResearchResponse>,
}

/// Research domain and best practices for a training task
#[tauri::command]
pub async fn research_domain(
    state: State<'_, AppState>,
    request: ResearchRequest,
) -> Result<ResearchResponse, String> {
    let client = state.yutori.lock().await;

    let result = client
        .research_ml_task(
            &request.task_description,
            request.model_type.as_deref().unwrap_or("llama"),
            request.training_type.as_deref().unwrap_or("sft"),
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(ResearchResponse {
        research_id: uuid::Uuid::new_v4().to_string(),
        summary: format!(
            "Research completed for {} task in {} domain",
            request.task_description, request.domain
        ),
        best_practices: result.best_practices,
        data_patterns: result.data_patterns,
        recommended_params: result
            .recommended_params
            .into_iter()
            .map(|p| ParamRecommendation {
                name: p.name,
                value: p.value,
                rationale: p.rationale,
            })
            .collect(),
        pitfalls: result.pitfalls,
        sources: vec![], // Yutori will populate this
    })
}

/// Get status of an ongoing research task
#[tauri::command]
pub async fn get_research_status(
    state: State<'_, AppState>,
    research_id: String,
) -> Result<ResearchStatus, String> {
    // For synchronous research, just return completed
    // In a real implementation, this would check async research status

    Ok(ResearchStatus {
        research_id,
        status: "completed".to_string(),
        progress: Some(1.0),
        result: None,
    })
}
