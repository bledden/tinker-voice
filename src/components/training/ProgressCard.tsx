import { TrainingRun } from '@/types';
import { Badge } from '../ui/Badge';
import { Activity, Clock, TrendingDown, Pause, Play, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ProgressCardProps {
  run: TrainingRun | null;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  className?: string;
}

function getStatusBadgeVariant(status: TrainingRun['status']): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'completed': return 'success';
    case 'running': return 'info';
    case 'pending': return 'default';
    case 'failed': return 'error';
    case 'cancelled': return 'warning';
  }
}

function LossChart({ lossHistory }: { lossHistory: number[] }) {
  if (lossHistory.length < 2) return null;

  const maxLoss = Math.max(...lossHistory);
  const minLoss = Math.min(...lossHistory);
  const range = maxLoss - minLoss || 1;

  const points = lossHistory.map((loss, idx) => {
    const x = (idx / (lossHistory.length - 1)) * 100;
    const y = 100 - ((loss - minLoss) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">Loss over time</span>
      </div>
      <svg viewBox="0 0 100 60" className="w-full h-24 bg-gray-900/50 rounded-lg">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-blue-500"
          points={points}
        />
        {lossHistory.length > 0 && (
          <circle
            cx={(lossHistory.length - 1) / (lossHistory.length - 1) * 100}
            cy={100 - ((lossHistory[lossHistory.length - 1] - minLoss) / range) * 80 - 10}
            r="2"
            className="fill-blue-400"
          />
        )}
      </svg>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Start</span>
        <span>Current: {lossHistory[lossHistory.length - 1]?.toFixed(4)}</span>
      </div>
    </div>
  );
}

export function ProgressCard({ run, onPause, onResume, onCancel, className = '' }: ProgressCardProps) {
  if (!run) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Activity className="h-12 w-12" />
          <p>No active training</p>
          <p className="text-sm">Start a training run to see progress</p>
        </div>
      </div>
    );
  }

  const progress = run.progress;
  const progressPercent = progress
    ? (progress.currentStep / progress.totalSteps) * 100
    : 0;

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-100">{run.name}</h3>
            <p className="text-sm text-gray-400">{run.config.model}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(run.status)}>
            {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 py-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm text-gray-200">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                run.status === 'completed' ? 'bg-green-500' :
                run.status === 'failed' ? 'bg-red-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        {progress && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Steps</p>
              <p className="text-lg font-medium text-gray-100">
                {progress.currentStep} / {progress.totalSteps}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Epochs</p>
              <p className="text-lg font-medium text-gray-100">
                {progress.currentEpoch} / {progress.totalEpochs}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Current Loss</p>
              <p className="text-lg font-medium text-gray-100">
                {progress.loss.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ETA
              </p>
              <p className="text-lg font-medium text-gray-100">
                {progress.eta}
              </p>
            </div>
          </div>
        )}

        {/* Loss Chart */}
        {progress && progress.lossHistory.length > 1 && (
          <LossChart lossHistory={progress.lossHistory} />
        )}

        {/* Error */}
        {run.status === 'failed' && run.error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-sm text-red-400">{run.error}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {run.status === 'running' && (
        <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
          {onPause && (
            <Button variant="secondary" size="sm" onClick={onPause}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          {onCancel && (
            <Button variant="danger" size="sm" onClick={onCancel}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      )}

      {run.status === 'pending' && onResume && (
        <div className="px-6 py-4 border-t border-gray-700">
          <Button variant="primary" size="sm" onClick={onResume}>
            <Play className="h-4 w-4" />
            Start
          </Button>
        </div>
      )}
    </div>
  );
}
