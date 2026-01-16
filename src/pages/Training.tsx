import { Play, Clock } from 'lucide-react';
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
}: TrainingPageProps) {
  const canStartTraining = config && dataset && !activeRun?.status?.match(/running|pending/);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Training</h1>
          {dataset && <p>{dataset.rows.length} examples</p>}
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
        <div className="page-content">
          {/* Config & Cost */}
          {(config || isLoadingConfig) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ConfigPreview config={config} loading={isLoadingConfig} />
              <CostEstimate config={config} datasetSize={dataset?.rows.length} />
            </div>
          )}

          {/* Active Training Progress */}
          {activeRun && (
            <div className="mb-8">
              <ProgressCard
                run={activeRun}
                onCancel={activeRun.status === 'running' ? onCancelTraining : undefined}
              />
            </div>
          )}

          {/* Past Runs */}
          <div className="card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-medium text-text-primary">History</h2>
            </div>

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
                    <div>
                      <p className="text-sm font-medium text-text-primary">{run.name}</p>
                      <p className="text-xs text-text-muted mt-1">{run.config.model}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`badge ${getStatusBadge(run.status)}`}>
                        {run.status}
                      </span>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(run.createdAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Clock className="empty-state-icon" />
                <h3>No training runs yet</h3>
                <p>Configure your settings and click "Start Training" to begin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
