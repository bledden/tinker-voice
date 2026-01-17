import { useState, useEffect } from 'react';
import { ArrowRight, Upload, Sparkles, RefreshCw, Loader2, MessageSquare, Download, ChevronDown } from 'lucide-react';
import { DataUploader } from '@/components/data/DataUploader';
import { DataPreview } from '@/components/data/DataPreview';
import { ValidationReportComponent } from '@/components/data/ValidationReport';
import { exportDatasetAsJSONL, exportDatasetAsCSV } from '@/lib/export';
import {
  TrainingIntent,
  DataSet,
  DataPreviewData,
  ValidationReport,
} from '@/types';

export interface DataReviewProps {
  intent: TrainingIntent | null;
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
  onBack,
  autoGenerate,
}: DataReviewProps) {
  const [dataSource, setDataSource] = useState<'upload' | 'generate' | null>(
    autoGenerate ? 'generate' : null
  );
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportJSONL = () => {
    if (dataset) {
      exportDatasetAsJSONL(dataset);
      setShowExportMenu(false);
    }
  };

  const handleExportCSV = () => {
    if (dataset) {
      exportDatasetAsCSV(dataset);
      setShowExportMenu(false);
    }
  };

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

  // Show empty state if no intent has been set
  if (!intent) {
    return (
      <div className="h-full bg-background flex flex-col">
        <div className="page-header">
          <h1>Review Training Data</h1>
          <p>Prepare your dataset for fine-tuning</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-lg font-medium text-text-primary mb-2">No training intent set</h2>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Start a voice conversation first to describe what you want to train your model to do.
            </p>
            <button
              onClick={onBack}
              className="btn btn-primary"
            >
              Go to Voice
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div className="min-w-0 flex-1 mr-4">
          <h1>Review Training Data</h1>
          <p className="truncate">{intent.description}</p>
        </div>
        <button
          onClick={onProceed}
          disabled={!canProceed}
          className="btn btn-primary flex-shrink-0"
        >
          Configure Training
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-6">
          {/* Data Source Selection */}
          {!dataSource && !dataset && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => setDataSource('upload')}
                className="p-6 rounded-lg border border-border bg-surface hover:border-accent transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-accent-muted flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <Upload className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">Upload Data</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Upload your own CSV or JSONL file with training examples
                </p>
              </button>

              <button
                onClick={() => {
                  setDataSource('generate');
                  onGenerateData();
                }}
                className="p-6 rounded-lg border border-border bg-surface hover:border-accent transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-accent-muted flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">Generate Synthetic</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Let Claude generate high-quality training data for you
                </p>
              </button>
            </div>
          )}

          {/* Upload Zone */}
          {dataSource === 'upload' && !dataset && (
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-text-primary">Upload Your Data</h2>
                <button
                  onClick={() => setDataSource(null)}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Choose different source
                </button>
              </div>
              <DataUploader onFileSelect={onUploadFile} />
            </div>
          )}

          {/* Generation Loading */}
          {isGenerating && (
            <div className="max-w-sm mx-auto text-center py-12">
              <Loader2 className="w-10 h-10 text-accent mx-auto mb-4 animate-spin" />
              <h3 className="text-sm font-medium text-text-primary mb-2">Generating Synthetic Data</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Claude is creating training examples based on your intent...
              </p>
            </div>
          )}

          {/* Dataset Preview */}
          {dataset && !isGenerating && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Data Preview */}
              <div className="space-y-4">
                <div className="card">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-sm font-medium text-text-primary truncate">{dataset.name}</h2>
                      <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${dataset.source === 'synthetic' ? 'bg-info-muted text-info' : 'bg-surface-subtle text-text-secondary'}`}>
                        {dataset.source === 'synthetic' ? 'Synthetic' : 'Uploaded'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Export dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowExportMenu(!showExportMenu)}
                          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-surface-subtle"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {showExportMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowExportMenu(false)}
                            />
                            <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                              <button
                                onClick={handleExportJSONL}
                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-subtle transition-colors"
                              >
                                Export as JSONL
                              </button>
                              <button
                                onClick={handleExportCSV}
                                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-subtle transition-colors"
                              >
                                Export as CSV
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {dataset.source === 'synthetic' && (
                        <button
                          onClick={onGenerateData}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                          Regenerate
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-text-secondary">{dataset.rows.length} training examples</p>
                  </div>
                </div>

                <DataPreview data={previewData} loading={isGenerating} />
              </div>

              {/* Right Column: Validation */}
              <div className="space-y-4">
                <div className="card">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">Data Validation</h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        AI-powered quality checks
                      </p>
                    </div>
                    <button
                      onClick={onValidate}
                      disabled={isValidating}
                      className="btn btn-secondary btn-sm"
                    >
                      {isValidating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {validationReport ? 'Re-validate' : 'Validate'}
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
    </div>
  );
}
