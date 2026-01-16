// Web API client for ChatMLE
// This replaces Tauri invoke calls for web deployment

// Get API keys from localStorage (for web deployment)
function getApiKey(service: string): string | null {
  return localStorage.getItem(`chatmle_${service}_key`);
}

export function setApiKey(service: string, key: string): void {
  localStorage.setItem(`chatmle_${service}_key`, key);
}

export function hasApiKey(service: string): boolean {
  return !!getApiKey(service);
}

// ElevenLabs API
export async function transcribeAudio(audioData: string): Promise<{ transcript: string }> {
  const apiKey = getApiKey('elevenlabs');
  if (!apiKey) throw new Error('ElevenLabs API key not configured');

  // Convert base64 to blob
  const binaryString = atob(audioData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const audioBlob = new Blob([bytes], { type: 'audio/webm' });

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('model_id', 'scribe_v1');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs transcription failed: ${response.statusText}`);
  }

  const result = await response.json();
  return { transcript: result.text };
}

export async function speakText(text: string): Promise<void> {
  const apiKey = getApiKey('elevenlabs');
  if (!apiKey) throw new Error('ElevenLabs API key not configured');

  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      reject(e);
    };
    audio.play();
  });
}

// Anthropic API
export async function chatWithClaude(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string
): Promise<string> {
  const apiKey = getApiKey('anthropic');
  if (!apiKey) throw new Error('Anthropic API key not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

// Intent parsing
export async function parseIntent(transcript: string): Promise<{
  id: string;
  description: string;
  taskType: string;
  domain: string;
  inputFormat: string;
  outputFormat: string;
  examples: string[];
  constraints: string[];
}> {
  const systemPrompt = `You are an AI assistant that parses user voice transcripts to extract ML training intent.
Extract the following information and return as JSON:
- description: A clear description of the training task
- taskType: One of "classification", "generation", "extraction", "summarization", "translation", "qa"
- domain: The domain/field (e.g., "customer_service", "legal", "medical", "general")
- inputFormat: Expected input format (e.g., "text", "json", "structured")
- outputFormat: Expected output format (e.g., "label", "text", "json")
- examples: 2-3 example input/output pairs as strings
- constraints: Any constraints or requirements mentioned

Return ONLY valid JSON, no markdown or explanation.`;

  const response = await chatWithClaude(
    [{ role: 'user', content: transcript }],
    systemPrompt
  );

  const parsed = JSON.parse(response);
  return {
    id: `intent-${Date.now()}`,
    ...parsed,
  };
}

// Synthetic data generation via Tonic or Claude
export async function generateSyntheticData(intent: {
  description: string;
  taskType: string;
  domain: string;
  inputFormat: string;
  outputFormat: string;
  examples: string[];
}): Promise<{
  id: string;
  name: string;
  rows: Array<{ id: string; input: string; output: string }>;
  format: string;
  createdAt: Date;
  source: string;
}> {
  const tonicKey = getApiKey('tonic');

  // Try Tonic first, fall back to Claude
  if (tonicKey) {
    // Tonic Fabricate API integration would go here
    // For now, fall through to Claude
  }

  const systemPrompt = `You are an AI that generates high-quality training data for ML fine-tuning.
Generate 50 diverse, realistic training examples based on the user's requirements.
Return ONLY a JSON array of objects with "input" and "output" fields.
Each example should be unique and representative of real-world data.
Do not include any markdown, just the raw JSON array.`;

  const userMessage = `Generate training data for this task:
Description: ${intent.description}
Task Type: ${intent.taskType}
Domain: ${intent.domain}
Input Format: ${intent.inputFormat}
Output Format: ${intent.outputFormat}
Example patterns: ${intent.examples.join('; ')}`;

  const response = await chatWithClaude(
    [{ role: 'user', content: userMessage }],
    systemPrompt
  );

  const rows = JSON.parse(response);

  return {
    id: `dataset-${Date.now()}`,
    name: `Synthetic data for ${intent.description.slice(0, 30)}...`,
    rows: rows.map((row: { input: string; output: string }, i: number) => ({
      id: `row-${i}`,
      input: row.input,
      output: row.output,
    })),
    format: 'jsonl',
    createdAt: new Date(),
    source: 'synthetic',
  };
}

// Data validation
export async function validateData(data: {
  rows: Array<{ input: string; output: string }>;
}): Promise<{
  qualityScore: number;
  totalRows: number;
  validRows: number;
  issues: Array<{
    rowIndex: number;
    field: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }>;
  suggestions: string[];
}> {
  const systemPrompt = `You are a data quality validator for ML training datasets.
Analyze the provided training data and return a quality report as JSON with:
- qualityScore: 0-100 score based on data quality
- issues: Array of {rowIndex, field, severity, message} for problems found
- suggestions: Array of improvement suggestions
Only return valid JSON, no markdown.`;

  const sampleRows = data.rows.slice(0, 20);
  const response = await chatWithClaude(
    [{ role: 'user', content: `Validate this training data:\n${JSON.stringify(sampleRows, null, 2)}` }],
    systemPrompt
  );

  const validation = JSON.parse(response);

  return {
    qualityScore: validation.qualityScore || 75,
    totalRows: data.rows.length,
    validRows: data.rows.length - (validation.issues?.filter((i: { severity: string }) => i.severity === 'error').length || 0),
    issues: validation.issues || [],
    suggestions: validation.suggestions || [],
  };
}

// Training config recommendation
export async function recommendConfig(
  intent: { taskType: string; domain: string },
  datasetSize: number
): Promise<{
  id: string;
  model: string;
  learningRate: number;
  epochs: number;
  batchSize: number;
  warmupSteps: number;
  trainingType: string;
  estimatedCost: number;
  estimatedTime: string;
}> {
  const systemPrompt = `You are an ML training configuration expert.
Based on the task and dataset, recommend optimal training hyperparameters.
Return JSON with: model, learningRate, epochs, batchSize, warmupSteps, trainingType (lora/full), estimatedCost, estimatedTime.
Only return valid JSON.`;

  const response = await chatWithClaude(
    [{ role: 'user', content: `Recommend config for: Task=${intent.taskType}, Domain=${intent.domain}, DatasetSize=${datasetSize}` }],
    systemPrompt
  );

  const config = JSON.parse(response);

  return {
    id: `config-${Date.now()}`,
    model: config.model || 'claude-3-haiku',
    learningRate: config.learningRate || 2e-5,
    epochs: config.epochs || 3,
    batchSize: config.batchSize || 8,
    warmupSteps: config.warmupSteps || 100,
    trainingType: config.trainingType || 'lora',
    estimatedCost: config.estimatedCost || 15.0,
    estimatedTime: config.estimatedTime || '~2 hours',
  };
}

// Training runs (via Tinker API)
export async function createTrainingRun(
  config: { model: string; learningRate: number; epochs: number; batchSize: number },
  datasetId: string
): Promise<{
  id: string;
  name: string;
  config: typeof config;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  datasetId: string;
  createdAt: Date;
}> {
  const tinkerKey = getApiKey('tinker');
  if (!tinkerKey) throw new Error('Tinker API key not configured');

  // For now, return a mock run - real Tinker API integration would go here
  return {
    id: `run-${Date.now()}`,
    name: `Training Run ${new Date().toLocaleDateString()}`,
    config,
    status: 'pending',
    datasetId,
    createdAt: new Date(),
  };
}

export async function startTrainingRun(runId: string): Promise<{
  id: string;
  status: 'running';
  startedAt: Date;
  progress: {
    currentStep: number;
    totalSteps: number;
    currentEpoch: number;
    totalEpochs: number;
    loss: number;
    lossHistory: number[];
    eta: string;
  };
}> {
  // Real implementation would call Tinker API
  return {
    id: runId,
    status: 'running',
    startedAt: new Date(),
    progress: {
      currentStep: 0,
      totalSteps: 100,
      currentEpoch: 0,
      totalEpochs: 3,
      loss: 2.5,
      lossHistory: [2.5],
      eta: '~20m',
    },
  };
}

export async function getTrainingStatus(runId: string): Promise<{
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: {
    currentStep: number;
    totalSteps: number;
    currentEpoch: number;
    totalEpochs: number;
    loss: number;
    lossHistory: number[];
    eta: string;
  };
}> {
  // Real implementation would poll Tinker API
  return {
    id: runId,
    status: 'running',
    progress: {
      currentStep: 50,
      totalSteps: 100,
      currentEpoch: 1,
      totalEpochs: 3,
      loss: 1.5,
      lossHistory: [2.5, 2.0, 1.5],
      eta: '~10m',
    },
  };
}

export async function cancelTrainingRun(runId: string): Promise<{
  id: string;
  status: 'cancelled';
}> {
  return {
    id: runId,
    status: 'cancelled',
  };
}

export async function listTrainingRuns(): Promise<Array<{
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
}>> {
  // Real implementation would fetch from Tinker API
  return [];
}
