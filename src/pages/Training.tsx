import { Play, Clock, Database, Activity } from 'lucide-react';
import { ConfigPreview } from '@/components/training/ConfigPreview';
import { ProgressCard } from '@/components/training/ProgressCard';
import { CostEstimate } from '@/components/training/CostEstimate';
import { TrainingConfig, TrainingRun, DataSet } from '@/types';

export interface TrainingPageProps {
  config: TrainingConfig | null;
  dataset: DataSet | null;
  activeRun: TrainingRun | null;
  runs: TrainingRun[];
  isLoadingConfig: boolean;
  isCreating: boolean;
  onStartTraining: () => void;
  onCancelTraining: () => void;
  onSelectRun: (run: TrainingRun) => void;
  onBack: () => void;
}

function getStatusBadge(status: TrainingRun['status']) {
  const styles: Record<TrainingRun['status'], string> = {
    completed: 'badge-success',
    running: 'badge-primary',
    pending: 'badge-neutral',
    failed: 'badge-error',
    cancelled: 'badge-warning',
  };
  return styles[status];
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
}

export function TrainingPage({
  config,
  dataset,
  activeRun,
  runs,
  isLoadingConfig,
  isCreating,
  onStartTraining,
  onCancelTraining,
  onSelectRun,
  onBack,
}: TrainingPageProps) {
  const canStartTraining = config && dataset && !activeRun?.status?.match(/running|pending/);

  // Show empty state if no dataset has been prepared
  if (!dataset && !config && !isLoadingConfig && runs.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="page-header">
          <h1>Training</h1>
          <p>Configure and run fine-tuning jobs</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-4">
              <Database className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-lg font-medium text-text-primary mb-2">No training data ready</h2>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Prepare your dataset first by describing your training intent and reviewing your data.
            </p>
            <button onClick={onBack} className="btn btn-primary">
              Go to Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Training</h1>
          {dataset && <p>{dataset.rows.length} examples ready</p>}
        </div>
        <button
          onClick={onStartTraining}
          disabled={!canStartTraining || isCreating}
          className="btn btn-primary"
        >
          <Play className="w-4 h-4" />
          {isCreating ? 'Creating...' : 'Start Training'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-6">
          {/* Config & Cost */}
          {(config || isLoadingConfig) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <ConfigPreview config={config} loading={isLoadingConfig} />
              <CostEstimate config={config} datasetSize={dataset?.rows.length} />
            </div>
          )}

          {/* Active Training Progress */}
          {activeRun && (
            <div className="mb-6">
              <ProgressCard
                run={activeRun}
                onCancel={activeRun.status === 'running' ? onCancelTraining : undefined}
              />
            </div>
          )}

          {/* Past Runs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">History</h2>
              {runs.length > 0 && (
                <span className="text-xs text-text-muted">{runs.length} run{runs.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="card">
              {runs.length > 0 ? (
                <div className="divide-y divide-border">
                  {runs.map((run) => (
                    <button
                      key={run.id}
                      onClick={() => onSelectRun(run)}
                      className={`w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-subtle transition-colors ${
                        activeRun?.id === run.id ? 'bg-accent-muted' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1 mr-4">
                        <p className="text-sm font-medium text-text-primary truncate">{run.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">{run.config.model}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`badge ${getStatusBadge(run.status)}`}>
                          {run.status}
                        </span>
                        <span className="text-xs text-text-muted flex items-center gap-1 min-w-[60px]">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(run.createdAt)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-10 px-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center mx-auto mb-3">
                    <Activity className="w-5 h-5 text-text-muted" />
                  </div>
                  <h3 className="text-sm font-medium text-text-primary mb-1">No training runs yet</h3>
                  <p className="text-xs text-text-secondary max-w-xs mx-auto">
                    Configure your settings and click "Start Training" to begin
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
