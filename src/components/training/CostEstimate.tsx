import { TrainingConfig } from '@/types';
import { DollarSign, Clock, Cpu, Database, Zap } from 'lucide-react';

export interface CostEstimateProps {
  config: TrainingConfig | null;
  datasetSize?: number;
  className?: string;
}

interface CostBreakdownItem {
  label: string;
  value: string;
  cost: number;
  icon: React.ComponentType<{ className?: string }>;
}

export function CostEstimate({ config, datasetSize, className = '' }: CostEstimateProps) {
  if (!config) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-8 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <DollarSign className="h-12 w-12" />
          <p>No cost estimate</p>
          <p className="text-sm">Configuration required for cost estimate</p>
        </div>
      </div>
    );
  }

  // Calculate breakdown (simplified estimates)
  const computeCost = config.estimatedCost * 0.6;
  const storageCost = config.estimatedCost * 0.15;
  const apiCost = config.estimatedCost * 0.25;

  const breakdown: CostBreakdownItem[] = [
    {
      label: 'Compute (GPU)',
      value: `${config.epochs} epochs`,
      cost: computeCost,
      icon: Cpu,
    },
    {
      label: 'Data Processing',
      value: datasetSize ? `${datasetSize} rows` : 'N/A',
      cost: storageCost,
      icon: Database,
    },
    {
      label: 'API Calls',
      value: 'Validation & Config',
      cost: apiCost,
      icon: Zap,
    },
  ];

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-gray-100">Cost Estimate</span>
        </div>
      </div>

      {/* Total */}
      <div className="px-6 py-6 border-b border-gray-700 bg-gray-900/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Estimated Total</p>
            <p className="text-3xl font-bold text-green-400">${config.estimatedCost.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400 flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" />
              Duration
            </p>
            <p className="text-lg font-medium text-gray-100">{config.estimatedTime}</p>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="px-6 py-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Cost Breakdown</h4>
        <div className="space-y-3">
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <item.icon className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-200">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.value}</p>
                </div>
              </div>
              <span className="text-gray-200">${item.cost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-6 py-3 border-t border-gray-700 bg-gray-900/20">
        <p className="text-xs text-gray-500 text-center">
          Estimates may vary based on actual compute usage and API calls
        </p>
      </div>
    </div>
  );
}
