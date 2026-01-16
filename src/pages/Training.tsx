import { Play, History, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

function getStatusStyles(status: TrainingRun['status']): string {
  switch (status) {
    case 'completed': return 'bg-success-muted text-success';
    case 'running': return 'bg-info-muted text-info';
    case 'pending': return 'bg-surface-elevated text-text-secondary';
    case 'failed': return 'bg-error-muted text-error';
    case 'cancelled': return 'bg-warning-muted text-warning';
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }
  if (diffHours > 0) return `${diffHours} hours ago`;
  if (diffMins > 0) return `${diffMins} minutes ago`;
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Training runs</h1>
          {dataset && (
            <p className="text-sm text-text-secondary mt-1">
              {dataset.rows.length} training examples
            </p>
          )}
        </div>
        <button
          onClick={onStartTraining}
          disabled={!canStartTraining || isCreating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <Play className="w-4 h-4" />
          {isCreating ? 'Creating...' : 'Start Training'}
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 p-8">
        {/* Config & Cost Row */}
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

        {/* Training Runs Table - Tinker style */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-text-secondary" />
              <h2 className="font-medium text-text-primary">Training runs</h2>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                placeholder="Search training runs..."
                className="pl-9 pr-4 py-1.5 text-sm bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-64"
              />
            </div>
          </div>

          {/* Table */}
          {runs.length > 0 ? (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Base Model</th>
                    <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Last Request Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => onSelectRun(run)}
                      className={`hover:bg-surface-elevated cursor-pointer transition-colors ${activeRun?.id === run.id ? 'bg-accent-subtle' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm text-text-primary font-mono">{run.id}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{run.config.model}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusStyles(run.status)}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{formatTimeAgo(run.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-6 py-3 border-t border-border flex items-center justify-between">
                <p className="text-sm text-text-muted">
                  Showing 1-{runs.length} of {runs.length}
                </p>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded hover:bg-surface-elevated text-text-muted disabled:opacity-50" disabled>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="px-3 py-1.5 rounded bg-surface-elevated text-text-primary text-sm font-medium">1</button>
                  <button className="p-1.5 rounded hover:bg-surface-elevated text-text-muted disabled:opacity-50" disabled>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center">
              <Play className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-base font-medium text-text-primary mb-2">No training runs yet</h3>
              <p className="text-sm text-text-secondary max-w-xs mx-auto">
                Configure your training settings and click "Start Training" to begin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
