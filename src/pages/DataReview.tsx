import { useState, useEffect } from 'react';
import { ArrowRight, Upload, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { DataUploader } from '@/components/data/DataUploader';
import { DataPreview } from '@/components/data/DataPreview';
import { ValidationReportComponent } from '@/components/data/ValidationReport';
import {
  TrainingIntent,
  DataSet,
  DataPreviewData,
  ValidationReport,
} from '@/types';

export interface DataReviewProps {
  intent: TrainingIntent;
  dataset: DataSet | null;
  validationReport: ValidationReport | null;
  isGenerating: boolean;
  isValidating: boolean;
  onGenerateData: () => void;
  onUploadFile: (file: File) => void;
  onValidate: () => void;
  onProceed: () => void;
  onBack: () => void;
  autoGenerate?: boolean;
}

export function DataReview({
  intent,
  dataset,
  validationReport,
  isGenerating,
  isValidating,
  onGenerateData,
  onUploadFile,
  onValidate,
  onProceed,
  autoGenerate,
}: DataReviewProps) {
  const [dataSource, setDataSource] = useState<'upload' | 'generate' | null>(
    autoGenerate ? 'generate' : null
  );

  // Auto-generate if coming from voice flow with generate choice
  useEffect(() => {
    if (autoGenerate && !dataset && !isGenerating) {
      onGenerateData();
    }
  }, []);

  // Convert dataset to preview format
  const previewData: DataPreviewData | null = dataset ? {
    headers: ['Input', 'Output'],
    rows: dataset.rows.slice(0, 10).map(row => [row.input, row.output]),
    totalRows: dataset.rows.length,
  } : null;

  const canProceed = dataset && validationReport && validationReport.qualityScore >= 50;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Review Training Data</h1>
          <p className="text-sm text-text-secondary mt-1">{intent.description}</p>
        </div>
        <button
          onClick={onProceed}
          disabled={!canProceed}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          Configure Training
          <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 p-8">
        {/* Data Source Selection */}
        {!dataSource && !dataset && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button
              onClick={() => setDataSource('upload')}
              className="p-8 rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-accent transition-all text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-accent-muted flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">Upload Data</h3>
              <p className="text-sm text-text-secondary">
                Upload your own CSV or JSONL file with training examples
              </p>
            </button>

            <button
              onClick={() => {
                setDataSource('generate');
                onGenerateData();
              }}
              className="p-8 rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-accent transition-all text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-accent-muted flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">Generate Synthetic</h3>
              <p className="text-sm text-text-secondary">
                Let Claude generate high-quality training data for you
              </p>
            </button>
          </div>
        )}

        {/* Upload Zone */}
        {dataSource === 'upload' && !dataset && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-text-primary">Upload Your Data</h2>
              <button
                onClick={() => setDataSource(null)}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Choose different source
              </button>
            </div>
            <DataUploader onFileSelect={onUploadFile} />
          </div>
        )}

        {/* Generation Loading */}
        {isGenerating && (
          <div className="max-w-md mx-auto text-center py-16">
            <Loader2 className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
            <h3 className="text-base font-medium text-text-primary mb-2">Generating Synthetic Data</h3>
            <p className="text-sm text-text-secondary">
              Claude is creating training examples based on your intent...
            </p>
          </div>
        )}

        {/* Dataset Preview */}
        {dataset && !isGenerating && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Data Preview */}
            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-xl">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-text-primary">{dataset.name}</h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${dataset.source === 'synthetic' ? 'bg-info-muted text-info' : 'bg-surface-elevated text-text-secondary'}`}>
                      {dataset.source === 'synthetic' ? 'Synthetic' : 'Uploaded'}
                    </span>
                  </div>
                  {dataset.source === 'synthetic' && (
                    <button
                      onClick={onGenerateData}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                      Regenerate
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm text-text-secondary">{dataset.rows.length} training examples</p>
                </div>
              </div>

              <DataPreview data={previewData} loading={isGenerating} />
            </div>

            {/* Right Column: Validation */}
            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-xl">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-text-primary">Data Validation</h3>
                    <p className="text-sm text-text-secondary mt-0.5">
                      Claude QA checks your data quality
                    </p>
                  </div>
                  <button
                    onClick={onValidate}
                    disabled={isValidating}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-elevated border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50 transition-colors"
                  >
                    {isValidating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    {validationReport ? 'Re-validate' : 'Validate Data'}
                  </button>
                </div>
              </div>

              <ValidationReportComponent
                report={validationReport}
                loading={isValidating}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
