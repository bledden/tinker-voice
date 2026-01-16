import { TrainingConfig } from '@/types';
import { Badge } from '../ui/Badge';
import { Settings, Cpu, Clock, Zap, Database, Layers } from 'lucide-react';

export interface ConfigPreviewProps {
  config: TrainingConfig | null;
  loading?: boolean;
  className?: string;
}

function ConfigRow({ icon: Icon, label, value, highlight = false }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className={highlight ? 'text-blue-400 font-medium' : 'text-gray-200'}>
        {value}
      </span>
    </div>
  );
}

export function ConfigPreview({ config, loading = false, className = '' }: ConfigPreviewProps) {
  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="animate-spin h-8 w-8 border-2 border-gray-600 border-t-blue-500 rounded-full" />
          <p>Generating recommended config...</p>
          <p className="text-sm text-gray-500">Claude is analyzing your data and intent</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Settings className="h-12 w-12" />
          <p>No configuration yet</p>
          <p className="text-sm">Configuration will be generated based on your data and intent</p>
        </div>
      </div>
    );
  }

  const trainingTypeLabels = {
    full: 'Full Fine-tuning',
    lora: 'LoRA',
    qlora: 'QLoRA',
  };

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-100">Recommended Configuration</span>
          </div>
          <Badge variant="info">{trainingTypeLabels[config.trainingType]}</Badge>
        </div>
      </div>

      {/* Config Details */}
      <div className="px-6 py-4 divide-y divide-gray-700">
        <ConfigRow icon={Cpu} label="Model" value={config.model} highlight />
        <ConfigRow icon={Zap} label="Learning Rate" value={config.learningRate.toExponential(1)} />
        <ConfigRow icon={Layers} label="Epochs" value={config.epochs} />
        <ConfigRow icon={Database} label="Batch Size" value={config.batchSize} />
        <ConfigRow icon={Clock} label="Warmup Steps" value={config.warmupSteps} />
      </div>

      {/* Estimates */}
      <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Estimated Time</p>
            <p className="text-lg font-medium text-gray-100">{config.estimatedTime}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Estimated Cost</p>
            <p className="text-lg font-medium text-green-400">${config.estimatedCost.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
