// Export utilities for datasets and configurations

import { DataSet, TrainingIntent, TrainingConfig, ValidationReport } from '@/types';

/**
 * Download a file to the user's device
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export dataset as JSONL (JSON Lines) format
 * Standard format for ML training data
 */
export function exportDatasetAsJSONL(dataset: DataSet): void {
  const lines = dataset.rows.map(row =>
    JSON.stringify({ input: row.input, output: row.output })
  );
  const content = lines.join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(content, `training-data-${timestamp}.jsonl`, 'application/jsonl');
}

/**
 * Export dataset as CSV format
 */
export function exportDatasetAsCSV(dataset: DataSet): void {
  // Escape CSV fields properly
  const escapeCSV = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const header = 'input,output';
  const rows = dataset.rows.map(row =>
    `${escapeCSV(row.input)},${escapeCSV(row.output)}`
  );
  const content = [header, ...rows].join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(content, `training-data-${timestamp}.csv`, 'text/csv');
}

/**
 * Export the full experiment configuration including intent, config, and validation
 */
export function exportExperimentConfig(
  intent: TrainingIntent,
  config: TrainingConfig | null,
  validationReport: ValidationReport | null,
  datasetInfo: { name: string; rowCount: number; source: string } | null
): void {
  const experiment = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    intent: {
      id: intent.id,
      description: intent.description,
      taskType: intent.taskType,
      domain: intent.domain,
      inputFormat: intent.inputFormat,
      outputFormat: intent.outputFormat,
      examples: intent.examples,
      constraints: intent.constraints,
    },
    dataset: datasetInfo ? {
      name: datasetInfo.name,
      rowCount: datasetInfo.rowCount,
      source: datasetInfo.source,
    } : null,
    trainingConfig: config ? {
      model: config.model,
      learningRate: config.learningRate,
      epochs: config.epochs,
      batchSize: config.batchSize,
      warmupSteps: config.warmupSteps,
      trainingType: config.trainingType,
      estimatedCost: config.estimatedCost,
      estimatedTime: config.estimatedTime,
    } : null,
    validation: validationReport ? {
      qualityScore: validationReport.qualityScore,
      totalRows: validationReport.totalRows,
      validRows: validationReport.validRows,
      issueCount: validationReport.issues.length,
      suggestions: validationReport.suggestions,
    } : null,
  };

  const content = JSON.stringify(experiment, null, 2);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(content, `experiment-config-${timestamp}.json`, 'application/json');
}

/**
 * Export just the training configuration
 */
export function exportTrainingConfig(config: TrainingConfig): void {
  const configExport = {
    exportedAt: new Date().toISOString(),
    model: config.model,
    hyperparameters: {
      learningRate: config.learningRate,
      epochs: config.epochs,
      batchSize: config.batchSize,
      warmupSteps: config.warmupSteps,
    },
    trainingType: config.trainingType,
    estimates: {
      cost: config.estimatedCost,
      time: config.estimatedTime,
    },
  };

  const content = JSON.stringify(configExport, null, 2);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(content, `training-config-${timestamp}.json`, 'application/json');
}
