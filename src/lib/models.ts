// Model Registry for ChatMLE (January 2026)
// Single source of truth for available models, capabilities, and pricing

// ============================================
// Provider Types
// ============================================

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'together'
  | 'fireworks'
  | 'groq'
  | 'local';

export type ModelCapability =
  | 'chat'
  | 'instruction'
  | 'code'
  | 'reasoning'
  | 'multilingual'
  | 'long-context'
  | 'vision';

export type TaskDomain =
  | 'general'
  | 'customer_support'
  | 'code'
  | 'legal'
  | 'medical'
  | 'ecommerce'
  | 'creative'
  | 'technical';

// ============================================
// Model Configuration
// ============================================

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  contextWindow: number;

  // Pricing (per 1M tokens)
  inputCostPer1M: number;
  outputCostPer1M: number;

  // Fine-tuning support
  finetunable: boolean;
  fineTuningCostPer1K?: number;

  // Capabilities
  capabilities: ModelCapability[];
  strengths: string[];

  // Recommendations
  recommendedFor: TaskDomain[];

  // Tier
  tier: 'free' | 'paid';
}

// ============================================
// AI Processing Models (for intent parsing, data gen, etc.)
// ============================================

export const AI_MODELS: ModelConfig[] = [
  // Anthropic - Paid tier
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Fast, intelligent model for most tasks. Great balance of speed and quality.',
    contextWindow: 200000,
    inputCostPer1M: 3,
    outputCostPer1M: 15,
    finetunable: false,
    capabilities: ['chat', 'instruction', 'code', 'reasoning'],
    strengths: ['Fast responses', 'Strong coding', 'Good for data generation'],
    recommendedFor: ['general', 'code', 'customer_support'],
    tier: 'paid',
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    description: 'Most capable model for complex reasoning and difficult tasks.',
    contextWindow: 200000,
    inputCostPer1M: 5,
    outputCostPer1M: 25,
    finetunable: false,
    capabilities: ['chat', 'instruction', 'code', 'reasoning', 'long-context'],
    strengths: ['Best reasoning', 'Complex analysis', 'Nuanced outputs'],
    recommendedFor: ['legal', 'medical', 'technical'],
    tier: 'paid',
  },

  // Free/Open Source via Groq (fast inference)
  {
    id: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B (Groq)',
    provider: 'groq',
    description: 'Fast, capable open model via Groq. Good free alternative.',
    contextWindow: 128000,
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    finetunable: false,
    capabilities: ['chat', 'instruction', 'reasoning'],
    strengths: ['Free tier available', 'Very fast', 'Good general quality'],
    recommendedFor: ['general', 'customer_support'],
    tier: 'free',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Groq)',
    provider: 'groq',
    description: 'Lightweight, ultra-fast model for simple tasks.',
    contextWindow: 128000,
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    finetunable: false,
    capabilities: ['chat', 'instruction'],
    strengths: ['Extremely fast', 'Free', 'Low latency'],
    recommendedFor: ['general'],
    tier: 'free',
  },
];

// ============================================
// Fine-Tuning Base Models
// ============================================

export const FINETUNE_MODELS: ModelConfig[] = [
  // Together.ai - has free tier for fine-tuning
  {
    id: 'meta-llama/Llama-3.1-8B-Instruct',
    name: 'Llama 3.1 8B Instruct',
    provider: 'together',
    description: 'Excellent instruction-following model. Best balance of quality and cost.',
    contextWindow: 128000,
    inputCostPer1M: 0.18,
    outputCostPer1M: 0.18,
    finetunable: true,
    fineTuningCostPer1K: 0.004,
    capabilities: ['chat', 'instruction', 'multilingual'],
    strengths: ['Great instruction following', 'Efficient', 'Multilingual'],
    recommendedFor: ['general', 'customer_support', 'ecommerce'],
    tier: 'paid',
  },
  {
    id: 'meta-llama/Llama-3.1-70B-Instruct',
    name: 'Llama 3.1 70B Instruct',
    provider: 'together',
    description: 'Larger model for complex tasks requiring more capability.',
    contextWindow: 128000,
    inputCostPer1M: 0.88,
    outputCostPer1M: 0.88,
    finetunable: true,
    fineTuningCostPer1K: 0.012,
    capabilities: ['chat', 'instruction', 'reasoning', 'multilingual'],
    strengths: ['High quality', 'Complex reasoning', 'Nuanced responses'],
    recommendedFor: ['legal', 'medical', 'technical'],
    tier: 'paid',
  },
  {
    id: 'Qwen/Qwen2.5-7B-Instruct',
    name: 'Qwen 2.5 7B Instruct',
    provider: 'together',
    description: 'Strong multilingual model with good coding ability.',
    contextWindow: 32000,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.15,
    finetunable: true,
    fineTuningCostPer1K: 0.003,
    capabilities: ['chat', 'instruction', 'code', 'multilingual'],
    strengths: ['Excellent for code', 'Strong multilingual', 'Cost effective'],
    recommendedFor: ['code', 'general'],
    tier: 'paid',
  },
  {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    name: 'Mistral 7B Instruct',
    provider: 'together',
    description: 'Fast, efficient model. Good for straightforward tasks.',
    contextWindow: 32000,
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.10,
    finetunable: true,
    fineTuningCostPer1K: 0.002,
    capabilities: ['chat', 'instruction'],
    strengths: ['Very fast', 'Cost effective', 'Good baseline'],
    recommendedFor: ['general', 'customer_support'],
    tier: 'free', // Together has free tier
  },

  // OpenAI - for those who want commercial support
  {
    id: 'gpt-4o-mini-2024-07-18',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'OpenAI smaller model. Good for those in OpenAI ecosystem.',
    contextWindow: 128000,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    finetunable: true,
    fineTuningCostPer1K: 0.008,
    capabilities: ['chat', 'instruction', 'code'],
    strengths: ['OpenAI quality', 'Good API', 'Reliable'],
    recommendedFor: ['general', 'code'],
    tier: 'paid',
  },
];

// ============================================
// Speech-to-Text Models
// ============================================

export interface STTModel {
  id: string;
  name: string;
  provider: 'openai' | 'deepgram' | 'assemblyai' | 'local';
  costPerMinute: number;
  languages: number;
  realtime: boolean;
  tier: 'free' | 'paid';
}

export const STT_MODELS: STTModel[] = [
  {
    id: 'whisper-1',
    name: 'OpenAI Whisper',
    provider: 'openai',
    costPerMinute: 0.006,
    languages: 99,
    realtime: false,
    tier: 'paid',
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large V3 (Local)',
    provider: 'local',
    costPerMinute: 0,
    languages: 99,
    realtime: false,
    tier: 'free',
  },
  {
    id: 'nova-2',
    name: 'Deepgram Nova-2',
    provider: 'deepgram',
    costPerMinute: 0.0043,
    languages: 36,
    realtime: true,
    tier: 'paid',
  },
];

// ============================================
// Domain-Based Default Configuration
// ============================================

export interface DomainDefaults {
  domain: TaskDomain;
  recommendedModel: string;
  recommendedExamples: number;
  trainingType: 'lora' | 'full';
  epochs: number;
  learningRate: number;
  reasoning: string;
}

export const DOMAIN_DEFAULTS: Record<TaskDomain, DomainDefaults> = {
  general: {
    domain: 'general',
    recommendedModel: 'meta-llama/Llama-3.1-8B-Instruct',
    recommendedExamples: 250,
    trainingType: 'lora',
    epochs: 3,
    learningRate: 2e-4,
    reasoning: 'Balanced defaults for general-purpose fine-tuning',
  },
  customer_support: {
    domain: 'customer_support',
    recommendedModel: 'meta-llama/Llama-3.1-8B-Instruct',
    recommendedExamples: 300,
    trainingType: 'lora',
    epochs: 3,
    learningRate: 2e-4,
    reasoning: 'Customer support benefits from conversational models with good instruction following',
  },
  code: {
    domain: 'code',
    recommendedModel: 'Qwen/Qwen2.5-7B-Instruct',
    recommendedExamples: 500,
    trainingType: 'lora',
    epochs: 4,
    learningRate: 1e-4,
    reasoning: 'Code tasks need more examples and lower learning rate for precision',
  },
  legal: {
    domain: 'legal',
    recommendedModel: 'meta-llama/Llama-3.1-70B-Instruct',
    recommendedExamples: 500,
    trainingType: 'lora',
    epochs: 3,
    learningRate: 1e-4,
    reasoning: 'Legal domain requires larger model for nuanced understanding',
  },
  medical: {
    domain: 'medical',
    recommendedModel: 'meta-llama/Llama-3.1-70B-Instruct',
    recommendedExamples: 500,
    trainingType: 'lora',
    epochs: 3,
    learningRate: 1e-4,
    reasoning: 'Medical content requires careful, accurate responses from larger model',
  },
  ecommerce: {
    domain: 'ecommerce',
    recommendedModel: 'meta-llama/Llama-3.1-8B-Instruct',
    recommendedExamples: 250,
    trainingType: 'lora',
    epochs: 3,
    learningRate: 2e-4,
    reasoning: 'E-commerce tasks are typically straightforward with clear patterns',
  },
  creative: {
    domain: 'creative',
    recommendedModel: 'meta-llama/Llama-3.1-8B-Instruct',
    recommendedExamples: 300,
    trainingType: 'lora',
    epochs: 4,
    learningRate: 3e-4,
    reasoning: 'Creative tasks benefit from slightly higher learning rate for style adaptation',
  },
  technical: {
    domain: 'technical',
    recommendedModel: 'Qwen/Qwen2.5-7B-Instruct',
    recommendedExamples: 400,
    trainingType: 'lora',
    epochs: 3,
    learningRate: 1e-4,
    reasoning: 'Technical documentation needs precision and code-aware model',
  },
};

// ============================================
// Helper Functions
// ============================================

export function getModelById(id: string): ModelConfig | undefined {
  return [...AI_MODELS, ...FINETUNE_MODELS].find(m => m.id === id);
}

export function getModelsForDomain(domain: TaskDomain): ModelConfig[] {
  return FINETUNE_MODELS.filter(m => m.recommendedFor.includes(domain));
}

export function getFreeModels(): ModelConfig[] {
  return FINETUNE_MODELS.filter(m => m.tier === 'free');
}

export function getPaidModels(): ModelConfig[] {
  return FINETUNE_MODELS.filter(m => m.tier === 'paid');
}

export function getDefaultsForDomain(domain: TaskDomain): DomainDefaults {
  return DOMAIN_DEFAULTS[domain] || DOMAIN_DEFAULTS.general;
}

// Get dynamic defaults based on what we know
export function getDynamicDefaults(
  domain?: TaskDomain,
  taskType?: string,
  datasetSize?: number,
  purpose?: 'testing' | 'production'
): {
  model: string;
  examples: number;
  trainingType: 'lora' | 'full';
  epochs: number;
  learningRate: number;
  reasoning: string;
} {
  // Start with domain defaults or general
  const base = DOMAIN_DEFAULTS[domain || 'general'];

  let model = base.recommendedModel;
  let examples = base.recommendedExamples;
  let trainingType: 'lora' | 'full' = base.trainingType;
  let epochs = base.epochs;
  let learningRate = base.learningRate;
  const reasons: string[] = [base.reasoning];

  // Adjust for purpose
  if (purpose === 'testing') {
    examples = Math.min(examples, 100);
    epochs = Math.min(epochs, 2);
    reasons.push('Reduced for quick testing');
  } else if (purpose === 'production') {
    examples = Math.max(examples, 500);
    epochs = Math.max(epochs, 3);
    reasons.push('Increased for production quality');
  }

  // Adjust for dataset size if provided
  if (datasetSize) {
    if (datasetSize < 100) {
      trainingType = 'lora';
      epochs = Math.min(epochs, 5);
      reasons.push('LoRA recommended for small datasets');
    } else if (datasetSize >= 2000) {
      trainingType = 'full';
      epochs = Math.min(epochs, 3);
      learningRate = learningRate / 10;
      reasons.push('Full fine-tuning considered for large datasets');
    }
  }

  // Adjust model for code tasks
  if (taskType === 'code' || domain === 'code') {
    model = 'Qwen/Qwen2.5-7B-Instruct';
    reasons.push('Using code-specialized model');
  }

  return {
    model,
    examples,
    trainingType,
    epochs,
    learningRate,
    reasoning: reasons.join('. '),
  };
}

// ============================================
// Synthetic Data Generation Defaults
// ============================================

export const SYNTHETIC_DATA_OPTIONS = [
  { value: 100, label: '100 examples', description: 'Quick test - validate your approach' },
  { value: 250, label: '250 examples', description: 'Small dataset - early prototype' },
  { value: 500, label: '500 examples', description: 'Medium dataset - solid baseline' },
  { value: 1000, label: '1000 examples', description: 'Large dataset - production ready' },
] as const;

export const DEFAULT_SYNTHETIC_COUNT = 250;
export const MAX_SYNTHETIC_COUNT = 2000;
export const SYNTHETIC_BATCH_SIZE = 50; // Generate in batches of 50
