// Voice-related types for ChatMLE

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  voiceState: VoiceState;
  transcript: TranscriptEntry[];
  currentTranscript: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  clearTranscript: () => void;
}

export interface VoiceButtonProps {
  voiceState: VoiceState;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface WaveformProps {
  isActive: boolean;
  audioData?: number[];
  color?: string;
  barCount?: number;
}

export interface TranscriptProps {
  entries: TranscriptEntry[];
  currentTranscript?: string;
  isListening?: boolean;
}

// Tauri command response types
export interface TranscriptionResult {
  transcript: string;
}

export interface SpeakResult {
  success: boolean;
}

// Training Intent types
export interface TrainingIntent {
  id: string;
  description: string;
  taskType: 'classification' | 'generation' | 'qa' | 'summarization' | 'custom';
  domain: string;
  inputFormat: string;
  outputFormat: string;
  examples?: string[];
  constraints?: string[];
}

// Dataset types
export interface DataRow {
  id: string;
  input: string;
  output: string;
  metadata?: Record<string, unknown>;
}

export interface DataSet {
  id: string;
  name: string;
  rows: DataRow[];
  format: 'csv' | 'jsonl';
  createdAt: Date;
  source: 'upload' | 'synthetic';
}

export interface DataPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

// Validation types
export interface ValidationIssue {
  rowIndex: number;
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ValidationReport {
  qualityScore: number;
  totalRows: number;
  validRows: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

// Training types
export type TrainingStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TrainingConfig {
  id: string;
  model: string;
  learningRate: number;
  epochs: number;
  batchSize: number;
  warmupSteps: number;
  trainingType: 'full' | 'lora' | 'qlora';
  estimatedCost: number;
  estimatedTime: string;
}

export interface TrainingProgress {
  currentStep: number;
  totalSteps: number;
  currentEpoch: number;
  totalEpochs: number;
  loss: number;
  lossHistory: number[];
  eta: string;
}

export interface TrainingRun {
  id: string;
  name: string;
  config: TrainingConfig;
  status: TrainingStatus;
  progress?: TrainingProgress;
  datasetId: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  fineTunedModel?: string;
  error?: string;
}

// Page props
export interface PageProps {
  className?: string;
}

// API Keys (Sponsors: Anthropic, Anyscale, Yutori)
export interface ApiKeysStatus {
  openai: boolean;      // Voice (not a sponsor, but needed)
  anthropic: boolean;   // Sponsor - Claude for reasoning
  anyscale: boolean;    // Sponsor - Fine-tuning
  yutori: boolean;      // Sponsor - Web research ($3.5k prize!)
}

// Yutori API types ($3.5k Best Yutori API Project prize!)
export type YutoriTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface YutoriResearchTask {
  taskId: string;
  status: YutoriTaskStatus;
  query: string;
  createdAt: Date;
  completedAt?: Date;
  results?: YutoriResearchResult[];
  error?: string;
}

export interface YutoriResearchResult {
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
  dataPoints?: string[];
}

export interface YutoriScout {
  scoutId: string;
  status: 'active' | 'paused' | 'stopped';
  query: string;
  schedule: 'hourly' | 'daily' | 'weekly';
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  findingsCount: number;
}

export interface YutoriResearchPanelProps {
  intent: TrainingIntent | null;
  isVisible: boolean;
  onResearchComplete?: (results: YutoriResearchResult[]) => void;
}

export interface DataScoutButtonProps {
  intent: TrainingIntent | null;
  onScoutCreated?: (scout: YutoriScout) => void;
}
