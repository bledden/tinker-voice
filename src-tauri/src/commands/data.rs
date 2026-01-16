//! Data commands for synthetic data generation and file uploads
//!
//! SESSION 2: Implement these commands

use tauri::State;
use crate::state::AppState;
use crate::api::tonic::OutputFormat;
use crate::commands::agents::TrainingIntent;
use serde::{Deserialize, Serialize};

// ============ Synthetic Data Generation ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateSyntheticDataRequest {
    pub intent: TrainingIntent,
    pub num_examples: u32,
    pub research_context: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedDataset {
    pub id: String,
    pub examples: Vec<TrainingExample>,
    pub generation_metadata: GenerationMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingExample {
    pub input: String,
    pub output: String,
    pub system: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationMetadata {
    pub source: String, // "tonic" or "uploaded"
    pub prompt_used: Option<String>,
    pub duration_ms: u64,
}

/// Generate synthetic training data
#[tauri::command]
pub async fn generate_synthetic_data(
    state: State<'_, AppState>,
    request: GenerateSyntheticDataRequest,
) -> Result<GeneratedDataset, String> {
    let client = state.tonic.lock().await;

    let examples = client
        .generate_training_data(
            &request.intent.task_description,
            &request.intent.domain,
            request.num_examples,
            request.research_context.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())?;

    let training_examples: Vec<TrainingExample> = examples
        .into_iter()
        .map(|e| TrainingExample {
            input: e.input,
            output: e.output,
            system: e.system,
        })
        .collect();

    Ok(GeneratedDataset {
        id: uuid::Uuid::new_v4().to_string(),
        examples: training_examples,
        generation_metadata: GenerationMetadata {
            source: "tonic".to_string(),
            prompt_used: Some(request.intent.task_description),
            duration_ms: 1000,
        },
    })
}

// ============ File Upload ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadedDataset {
    pub id: String,
    pub examples: Vec<TrainingExample>,
    pub file_metadata: FileMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub filename: String,
    pub format: String,
    pub size_bytes: u64,
    pub row_count: u32,
}

/// Upload and parse a dataset file
#[tauri::command]
pub async fn upload_dataset(
    file_path: String,
    format: Option<String>,
) -> Result<UploadedDataset, String> {
    // Read the file
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let file_metadata = std::fs::metadata(&file_path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;

    let filename = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Detect format
    let detected_format = format.unwrap_or_else(|| {
        if filename.ends_with(".jsonl") {
            "jsonl".to_string()
        } else if filename.ends_with(".json") {
            "json".to_string()
        } else if filename.ends_with(".csv") {
            "csv".to_string()
        } else {
            "unknown".to_string()
        }
    });

    // Parse based on format
    let examples = match detected_format.as_str() {
        "jsonl" => parse_jsonl(&content)?,
        "json" => parse_json(&content)?,
        "csv" => parse_csv(&content)?,
        _ => return Err(format!("Unsupported format: {}", detected_format)),
    };

    Ok(UploadedDataset {
        id: uuid::Uuid::new_v4().to_string(),
        examples: examples.clone(),
        file_metadata: FileMetadata {
            filename,
            format: detected_format,
            size_bytes: file_metadata.len(),
            row_count: examples.len() as u32,
        },
    })
}

fn parse_jsonl(content: &str) -> Result<Vec<TrainingExample>, String> {
    content
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            serde_json::from_str::<TrainingExample>(line)
                .map_err(|e| format!("Failed to parse JSONL line: {}", e))
        })
        .collect()
}

fn parse_json(content: &str) -> Result<Vec<TrainingExample>, String> {
    serde_json::from_str::<Vec<TrainingExample>>(content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))
}

fn parse_csv(content: &str) -> Result<Vec<TrainingExample>, String> {
    let mut examples = Vec::new();
    let mut lines = content.lines();

    // Skip header
    let header = lines.next().ok_or("Empty CSV file")?;
    let headers: Vec<&str> = header.split(',').map(|s| s.trim()).collect();

    // Find column indices
    let input_idx = headers.iter().position(|h| *h == "input" || *h == "prompt")
        .ok_or("CSV must have 'input' or 'prompt' column")?;
    let output_idx = headers.iter().position(|h| *h == "output" || *h == "completion" || *h == "response")
        .ok_or("CSV must have 'output', 'completion', or 'response' column")?;
    let system_idx = headers.iter().position(|h| *h == "system");

    for line in lines {
        if line.trim().is_empty() {
            continue;
        }

        let cols: Vec<&str> = line.split(',').collect();
        if cols.len() <= input_idx.max(output_idx) {
            continue;
        }

        examples.push(TrainingExample {
            input: cols.get(input_idx).unwrap_or(&"").to_string(),
            output: cols.get(output_idx).unwrap_or(&"").to_string(),
            system: system_idx.and_then(|i| cols.get(i).map(|s| s.to_string())),
        });
    }

    Ok(examples)
}

// ============ Data Preview ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPreview {
    pub samples: Vec<TrainingExample>,
    pub total_count: u32,
}

/// Preview dataset (first N examples)
#[tauri::command]
pub async fn preview_dataset(
    examples: Vec<TrainingExample>,
    limit: Option<u32>,
) -> Result<DataPreview, String> {
    let limit = limit.unwrap_or(10) as usize;
    let total = examples.len() as u32;

    Ok(DataPreview {
        samples: examples.into_iter().take(limit).collect(),
        total_count: total,
    })
}

// ============ Dataset Stats ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatasetStats {
    pub num_samples: u32,
    pub avg_input_length: u32,
    pub avg_output_length: u32,
    pub avg_tokens_per_sample: u32,
    pub max_tokens: u32,
    pub min_tokens: u32,
    pub has_system_prompts: bool,
    pub unique_system_prompts: u32,
}

/// Get statistics about a dataset
#[tauri::command]
pub async fn get_dataset_stats(
    examples: Vec<TrainingExample>,
) -> Result<DatasetStats, String> {
    if examples.is_empty() {
        return Err("Dataset is empty".to_string());
    }

    let num_samples = examples.len() as u32;

    // Calculate lengths (approximate tokens as words * 1.3)
    let input_lengths: Vec<u32> = examples
        .iter()
        .map(|e| (e.input.split_whitespace().count() as f32 * 1.3) as u32)
        .collect();

    let output_lengths: Vec<u32> = examples
        .iter()
        .map(|e| (e.output.split_whitespace().count() as f32 * 1.3) as u32)
        .collect();

    let total_lengths: Vec<u32> = input_lengths
        .iter()
        .zip(output_lengths.iter())
        .map(|(i, o)| i + o)
        .collect();

    let avg_input_length = input_lengths.iter().sum::<u32>() / num_samples;
    let avg_output_length = output_lengths.iter().sum::<u32>() / num_samples;
    let avg_tokens = total_lengths.iter().sum::<u32>() / num_samples;
    let max_tokens = *total_lengths.iter().max().unwrap_or(&0);
    let min_tokens = *total_lengths.iter().min().unwrap_or(&0);

    let system_prompts: std::collections::HashSet<_> = examples
        .iter()
        .filter_map(|e| e.system.as_ref())
        .collect();

    Ok(DatasetStats {
        num_samples,
        avg_input_length,
        avg_output_length,
        avg_tokens_per_sample: avg_tokens,
        max_tokens,
        min_tokens,
        has_system_prompts: !system_prompts.is_empty(),
        unique_system_prompts: system_prompts.len() as u32,
    })
}
