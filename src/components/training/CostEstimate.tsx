import { TrainingConfig } from '@/types';
import { calculateTrainingCost } from '@/lib/api';
import { DollarSign, Clock, Cpu, Zap, Sparkles, Mic } from 'lucide-react';

export interface CostEstimateProps {
  config: TrainingConfig | null;
  datasetSize?: number;
  usedSyntheticData?: boolean;
  usedVoiceInput?: boolean;
  className?: string;
}

interface CostBreakdownItem {
  label: string;
  value: string;
  cost: number;
  icon: React.ComponentType<{ className?: string }>;
}

// ============================================
// API Pricing Constants (January 2026)
// ============================================

// OpenAI Whisper: $0.006 per minute of audio
const WHISPER_COST_PER_MINUTE = 0.006;

// Claude Sonnet 4: $3/1M input, $15/1M output (used for most processing)
const CLAUDE_INPUT_COST_PER_1K = 0.003;
const CLAUDE_OUTPUT_COST_PER_1K = 0.015;

// ============================================
// Cost Calculation Functions
// ============================================

interface CostBreakdown {
  voice: number;          // Whisper + TTS
  intentParsing: number;  // Claude for intent
  syntheticData: number;  // Claude for data gen (if used)
  validation: number;     // Claude for validation
  configRec: number;      // Claude for config
  training: number;       // Anyscale fine-tuning
  total: number;
}

function calculateCosts(
  datasetSize: number,
  usedSyntheticData: boolean,
  trainingType: 'lora' | 'full' | string,
  epochs: number,
  usedVoiceInput: boolean = true
): CostBreakdown {
  // Voice costs: estimate ~1 min speech input (no TTS - text output only)
  const voiceInputMinutes = usedVoiceInput ? 1 : 0;
  const voice = voiceInputMinutes * WHISPER_COST_PER_MINUTE;

  // Intent parsing: ~1000 input tokens, ~500 output tokens
  const intentParsing = (1000 / 1000 * CLAUDE_INPUT_COST_PER_1K) + (500 / 1000 * CLAUDE_OUTPUT_COST_PER_1K);

  // Synthetic data generation (only if used)
  let syntheticData = 0;
  if (usedSyntheticData) {
    // Prompt + context: ~1500 input tokens
    // Output: ~150 tokens per row
    const synInputTokens = 1500;
    const synOutputTokens = datasetSize * 150;
    syntheticData = (synInputTokens / 1000 * CLAUDE_INPUT_COST_PER_1K) +
                    (synOutputTokens / 1000 * CLAUDE_OUTPUT_COST_PER_1K);
  }

  // Validation: system prompt + data sample (~50 tokens/row), ~300 output
  const valInputTokens = 500 + Math.min(datasetSize * 50, 3000); // Cap at 3K for sampling
  const valOutputTokens = 300;
  const validation = (valInputTokens / 1000 * CLAUDE_INPUT_COST_PER_1K) +
                     (valOutputTokens / 1000 * CLAUDE_OUTPUT_COST_PER_1K);

  // Config recommendation: ~500 input, ~300 output
  const configRec = (500 / 1000 * CLAUDE_INPUT_COST_PER_1K) + (300 / 1000 * CLAUDE_OUTPUT_COST_PER_1K);

  // Training cost: use shared calculation from api.ts
  const training = calculateTrainingCost(datasetSize, epochs, trainingType);

  const total = voice + intentParsing + syntheticData + validation + configRec + training;

  return {
    voice,
    intentParsing,
    syntheticData,
    validation,
    configRec,
    training,
    total,
  };
}

export function CostEstimate({ config, datasetSize, usedSyntheticData = false, usedVoiceInput = true, className = '' }: CostEstimateProps) {
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

  // Calculate actual costs
  const rows = datasetSize || 250; // Updated default from 50 to 250
  const costs = calculateCosts(rows, usedSyntheticData, config.trainingType, config.epochs, usedVoiceInput);

  const breakdown: CostBreakdownItem[] = [
    {
      label: 'Fine-tuning',
      value: `${config.trainingType.toUpperCase()}, ${config.epochs} epoch${config.epochs !== 1 ? 's' : ''}, ${rows} rows`,
      cost: costs.training,
      icon: Cpu,
    },
  ];

  // Add synthetic data cost if used
  if (usedSyntheticData && costs.syntheticData > 0) {
    breakdown.push({
      label: 'Synthetic Data',
      value: `${rows} rows generated`,
      cost: costs.syntheticData,
      icon: Sparkles,
    });
  }

  // Claude API costs (intent + validation + config)
  const claudeApiCost = costs.intentParsing + costs.validation + costs.configRec;
  breakdown.push({
    label: 'AI Processing',
    value: 'Intent, validation, config',
    cost: claudeApiCost,
    icon: Zap,
  });

  // Voice costs (Whisper only - no TTS)
  if (costs.voice > 0) {
    breakdown.push({
      label: 'Voice Input',
      value: 'Speech transcription',
      cost: costs.voice,
      icon: Mic,
    });
  }

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
            <p className="text-3xl font-bold text-green-400">${costs.total.toFixed(2)}</p>
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
