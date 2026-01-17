// Web API client for ChatMLE
// This replaces Tauri invoke calls for web deployment

// Safe JSON parsing helper - handles non-JSON responses (like HTML error pages)
async function safeJsonParse(response: Response): Promise<unknown> {
  // Check Content-Type header first
  const contentType = response.headers.get('Content-Type') || '';

  const text = await response.text();

  // Detect HTML responses (backend not running, wrong endpoint, etc.)
  if (contentType.includes('text/html') || text.includes('<!DOCTYPE') || text.includes('<html')) {
    throw new Error(
      'Backend server not reachable. Run "bun run start" in a separate terminal to start the proxy server.'
    );
  }

  // Try to parse as JSON
  try {
    return JSON.parse(text);
  } catch {
    // Provide context about what we received
    const preview = text.slice(0, 150).replace(/\n/g, ' ');
    throw new Error(`Expected JSON but received: ${preview}${text.length > 150 ? '...' : ''}`);
  }
}

// Wrapper to ensure we get JSON responses from API calls
async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  // Check for HTML before anything else (catches missing backend early)
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(
      'Backend server not reachable. Run "bun run start" in a separate terminal to start the proxy server.'
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || error.message || error.detail || response.statusText;
    } catch {
      errorMessage = errorText.slice(0, 200) || response.statusText;
    }
    throw new Error(`API error (${response.status}): ${errorMessage}`);
  }

  return safeJsonParse(response) as Promise<T>;
}

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

// OpenAI Whisper API for Speech-to-Text
export async function transcribeAudio(audioData: string): Promise<{ transcript: string }> {
  const apiKey = getApiKey('openai');
  if (!apiKey) throw new Error('OpenAI API key not configured');

  // Convert base64 to blob
  const binaryString = atob(audioData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const audioBlob = new Blob([bytes], { type: 'audio/webm' });

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.error || response.statusText;
    throw new Error(`OpenAI transcription failed: ${errorMessage}`);
  }

  const result = await response.json();
  return { transcript: result.text };
}

// OpenAI TTS API for Text-to-Speech
export async function speakText(text: string): Promise<void> {
  const apiKey = getApiKey('openai');
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'alloy',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.error || response.statusText;
    throw new Error(`OpenAI TTS failed: ${errorMessage}`);
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

The user has described what they want to train a model to do. Extract structured information from their request.

Extract the following fields and return as a JSON object:
{
  "description": "A clear, detailed description of what the model should learn to do",
  "taskType": "One of: classification, generation, extraction, summarization, translation, qa",
  "domain": "The domain/field (e.g., customer_service, legal, medical, ecommerce, general)",
  "inputFormat": "What the model receives (e.g., email text, customer message, document)",
  "outputFormat": "What the model should produce (e.g., category label, response text, extracted fields)",
  "examples": ["2-3 concrete example input→output pairs showing what the model should do"],
  "constraints": ["Any constraints or specific requirements mentioned"]
}

IMPORTANT:
- Be specific in the description - include the categories/labels if it's classification
- For examples, create realistic ones based on what the user described
- Return ONLY valid JSON, no markdown code blocks or explanation`;

  const response = await chatWithClaude(
    [{ role: 'user', content: `Parse this training intent: "${transcript}"` }],
    systemPrompt
  );

  // Clean potential markdown code blocks
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleanedResponse);

  return {
    id: `intent-${Date.now()}`,
    ...parsed,
  };
}

// Yutori Research API - Web research for training data (Sponsor - $3.5k prize!)
export async function researchTrainingData(intent: {
  description: string;
  domain: string;
}): Promise<{ taskId: string; status: string; viewUrl?: string }> {
  const yutoriKey = getApiKey('yutori');
  if (!yutoriKey) throw new Error('Yutori API key not configured');

  const response = await fetch('https://api.yutori.com/v1/research/tasks', {
    method: 'POST',
    headers: {
      'X-API-Key': yutoriKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `Research and find real-world examples of ${intent.description} in the ${intent.domain} domain. Look for datasets, example inputs/outputs, and common patterns that could be used for ML training. Summarize the key findings and provide example data points.`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Yutori API error: ${errorData.error || errorData.detail || response.statusText}`);
  }

  const data = await response.json();
  return {
    taskId: data.task_id,
    status: data.status,
    viewUrl: data.view_url,
  };
}

// Yutori Task Status API - Get status and results of a research task
export async function getYutoriTaskStatus(taskId: string): Promise<{
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: Array<{
    title: string;
    url: string;
    snippet: string;
    relevanceScore: number;
    dataPoints?: string[];
  }>;
  error?: string;
}> {
  const yutoriKey = getApiKey('yutori');
  if (!yutoriKey) throw new Error('Yutori API key not configured');

  const response = await fetch(`https://api.yutori.com/v1/research/tasks/${taskId}`, {
    method: 'GET',
    headers: {
      'X-API-Key': yutoriKey,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Yutori API error: ${errorData.error || errorData.detail || response.statusText}`);
  }

  const data = await response.json();

  // Map Yutori status to our status type
  const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed'> = {
    queued: 'pending',
    running: 'running',
    succeeded: 'completed',
    failed: 'failed',
  };

  // Transform API response to our format
  return {
    taskId: data.task_id || taskId,
    status: statusMap[data.status] || 'pending',
    results: data.results?.map((r: { title?: string; url?: string; content?: string; summary?: string }) => ({
      title: r.title || 'Research Result',
      url: r.url || '',
      snippet: (r.summary || r.content || '').slice(0, 200),
      relevanceScore: 0.8,
      dataPoints: [],
    })),
    error: data.error,
  };
}

// Yutori Scouting API - Monitor for new training data sources
export async function createDataScout(intent: {
  description: string;
  domain: string;
  schedule?: 'hourly' | 'daily' | 'weekly';
}): Promise<{ scoutId: string; status: string }> {
  const yutoriKey = getApiKey('yutori');
  if (!yutoriKey) throw new Error('Yutori API key not configured');

  // Convert schedule to output_interval in seconds
  // hourly = 3600, daily = 86400, weekly = 604800
  const intervalMap: Record<string, number> = {
    hourly: 3600,
    daily: 86400,
    weekly: 604800,
  };
  const outputInterval = intervalMap[intent.schedule || 'daily'] || 86400;

  const response = await fetch('https://api.yutori.com/v1/scouting/tasks', {
    method: 'POST',
    headers: {
      'X-API-Key': yutoriKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `Monitor the web for new datasets, papers, or resources related to: ${intent.description} in ${intent.domain}`,
      output_interval: outputInterval,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Yutori Scouting API error: ${errorData.error || errorData.detail || response.statusText}`);
  }

  const data = await response.json();
  return {
    scoutId: data.id,
    status: 'active',
  };
}

// Synthetic data generation via Claude (with optional Yutori web research)
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
  // Optionally use Yutori to research real-world examples first
  const yutoriKey = getApiKey('yutori');

  if (yutoriKey) {
    // Kick off web research in background (non-blocking, enhances future generations)
    researchTrainingData(intent).catch((e) => {
      console.warn('Yutori research failed, continuing with Claude:', e);
    });
  }

  const systemPrompt = `You are an AI that generates high-quality synthetic training data for ML fine-tuning.

Your task is to create diverse, realistic training examples that will help a model learn the specified task.

REQUIREMENTS:
1. Generate exactly 50 unique training examples
2. Each example must have an "input" and "output" field
3. Make inputs diverse - vary length, complexity, tone, and specific details
4. Outputs must be consistent with the task type and match the expected format
5. For classification, ensure balanced distribution across categories
6. Make data realistic - as if it came from real users/systems

Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.
Example format: [{"input": "...", "output": "..."}, ...]`;

  const userMessage = `Generate 50 training examples for this ML task:

TASK DESCRIPTION: ${intent.description}
TASK TYPE: ${intent.taskType}
DOMAIN: ${intent.domain}
INPUT FORMAT: ${intent.inputFormat}
OUTPUT FORMAT: ${intent.outputFormat}
EXAMPLE PATTERNS: ${intent.examples.length > 0 ? intent.examples.join('\n') : 'Generate appropriate examples based on the task description'}

Generate diverse, realistic examples now:`;

  const response = await chatWithClaude(
    [{ role: 'user', content: userMessage }],
    systemPrompt
  );

  // Clean potential markdown code blocks
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const rows = JSON.parse(cleanedResponse);

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

Analyze the provided training data samples and return a quality assessment.

CHECK FOR:
1. Empty or very short inputs/outputs
2. Duplicate or near-duplicate examples
3. Inconsistent formatting in outputs
4. Potential data quality issues (typos, nonsensical text)
5. Label/category consistency for classification tasks
6. Appropriate diversity of examples

Return a JSON object with:
{
  "qualityScore": 0-100 (overall quality score),
  "issues": [{"rowIndex": 0, "field": "input"|"output", "severity": "error"|"warning"|"info", "message": "description"}],
  "suggestions": ["actionable improvement suggestions"]
}

Return ONLY valid JSON, no markdown code blocks.`;

  const sampleRows = data.rows.slice(0, 20);
  const response = await chatWithClaude(
    [{ role: 'user', content: `Validate these ${data.rows.length} training examples (showing first 20):\n${JSON.stringify(sampleRows, null, 2)}` }],
    systemPrompt
  );

  // Clean potential markdown code blocks
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const validation = JSON.parse(cleanedResponse);

  return {
    qualityScore: validation.qualityScore || 75,
    totalRows: data.rows.length,
    validRows: data.rows.length - (validation.issues?.filter((i: { severity: string }) => i.severity === 'error').length || 0),
    issues: validation.issues || [],
    suggestions: validation.suggestions || [],
  };
}

// ============================================
// Training Cost Calculation (single source of truth)
// ============================================

// Anyscale fine-tuning costs (per 1K tokens)
const ANYSCALE_LORA_COST_PER_1K = 0.004;   // ~$0.003-0.005
const ANYSCALE_FULL_COST_PER_1K = 0.012;   // ~$0.008-0.015
const TOKENS_PER_ROW = 200;                 // Average tokens per training row

export function calculateTrainingCost(
  datasetSize: number,
  epochs: number,
  trainingType: 'lora' | 'full' | string
): number {
  const totalTokens = datasetSize * TOKENS_PER_ROW * epochs;
  const costPerToken = trainingType === 'lora' ? ANYSCALE_LORA_COST_PER_1K : ANYSCALE_FULL_COST_PER_1K;
  return totalTokens / 1000 * costPerToken;
}

export function estimateTrainingTime(
  datasetSize: number,
  epochs: number,
  trainingType: 'lora' | 'full' | string
): string {
  // Rough estimates based on typical training speeds
  const baseMinutes = trainingType === 'lora' ? 5 : 15;
  const rowFactor = datasetSize / 100;
  const totalMinutes = baseMinutes + (rowFactor * epochs * 2);

  if (totalMinutes < 60) {
    return `~${Math.round(totalMinutes)} minutes`;
  } else {
    const hours = totalMinutes / 60;
    if (hours < 2) {
      return `~1-2 hours`;
    } else {
      return `~${Math.round(hours)} hours`;
    }
  }
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
Return JSON with: model, learningRate, epochs, batchSize, warmupSteps, trainingType (lora/full).

Guidelines:
- Prefer LoRA for small datasets (<500 rows) as it's faster and more cost-effective
- Use full fine-tuning for larger datasets (1000+ rows) when maximum quality is needed
- Typical epochs: 3-5 for LoRA, 2-3 for full fine-tuning
- Learning rate: 1e-4 to 3e-4 for LoRA, 1e-5 to 5e-5 for full
- Recommend appropriate base models for the task (e.g., meta-llama/Llama-2-7b-chat-hf for chat tasks)

Only return valid JSON.`;

  const response = await chatWithClaude(
    [{ role: 'user', content: `Recommend config for: Task=${intent.taskType}, Domain=${intent.domain}, DatasetSize=${datasetSize}` }],
    systemPrompt
  );

  // Clean potential markdown code blocks
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const config = JSON.parse(cleanedResponse);

  // Extract hyperparameters
  const trainingType = config.trainingType || 'lora';
  const epochs = typeof config.epochs === 'number' ? config.epochs : 3;

  // Calculate cost and time using our formulas (single source of truth)
  const estimatedCost = calculateTrainingCost(datasetSize, epochs, trainingType);
  const estimatedTime = estimateTrainingTime(datasetSize, epochs, trainingType);

  return {
    id: `config-${Date.now()}`,
    model: config.model || 'meta-llama/Llama-2-7b-chat-hf',
    learningRate: typeof config.learningRate === 'number' ? config.learningRate : 2e-4,
    epochs,
    batchSize: typeof config.batchSize === 'number' ? config.batchSize : 8,
    warmupSteps: typeof config.warmupSteps === 'number' ? config.warmupSteps : 100,
    trainingType,
    estimatedCost,
    estimatedTime,
  };
}

// Anyscale Fine-Tuning API (via backend proxy to avoid CORS)
// In production, requests go through /api/anyscale/* which proxies to Anyscale
const ANYSCALE_PROXY_URL = '/api/anyscale';

type TrainingStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Map Anyscale job status to our status type
function mapAnyscaleStatus(status: string): TrainingStatus {
  const statusMap: Record<string, TrainingStatus> = {
    validating_files: 'pending',
    queued: 'pending',
    running: 'running',
    succeeded: 'completed',
    failed: 'failed',
    cancelled: 'cancelled',
  };
  return statusMap[status] || 'pending';
}

// Helper: Upload training file to Anyscale (via proxy)
async function uploadTrainingFile(
  data: Array<{ input: string; output: string }>,
  apiKey: string
): Promise<string> {
  // Convert to JSONL format for chat fine-tuning
  const jsonlContent = data
    .map((row) =>
      JSON.stringify({
        messages: [
          { role: 'user', content: row.input },
          { role: 'assistant', content: row.output },
        ],
      })
    )
    .join('\n');

  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
  const formData = new FormData();
  formData.append('file', blob, 'training_data.jsonl');
  formData.append('purpose', 'fine-tune');

  const response = await fetch(`${ANYSCALE_PROXY_URL}/files`, {
    method: 'POST',
    headers: {
      'X-Anyscale-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || error.message || error.detail || response.statusText;
    } catch {
      errorMessage = errorText.slice(0, 200) || response.statusText;
    }
    throw new Error(`Anyscale file upload failed (${response.status}): ${errorMessage}`);
  }

  const result = await safeJsonParse(response) as { id: string };
  return result.id;
}

// Training runs (via Anyscale API)
export async function createTrainingRun(
  config: { model: string; learningRate: number; epochs: number; batchSize: number },
  datasetId: string,
  trainingData?: Array<{ input: string; output: string }>
): Promise<{
  id: string;
  name: string;
  config: typeof config;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  datasetId: string;
  createdAt: Date;
}> {
  const anyscaleKey = getApiKey('anyscale');
  if (!anyscaleKey) throw new Error('Anyscale API key not configured');

  // Upload training data if provided
  let fileId = datasetId;
  if (trainingData && trainingData.length > 0) {
    fileId = await uploadTrainingFile(trainingData, anyscaleKey);
  }

  // Create fine-tuning job via Anyscale API (through proxy)
  const response = await fetch(`${ANYSCALE_PROXY_URL}/fine_tuning/jobs`, {
    method: 'POST',
    headers: {
      'X-Anyscale-Key': anyscaleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      training_file: fileId,
      model: config.model || 'meta-llama/Llama-2-7b-chat-hf',
      hyperparameters: {
        n_epochs: config.epochs,
        learning_rate_multiplier: config.learningRate,
        batch_size: config.batchSize,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || error.message || error.detail || response.statusText;
    } catch {
      errorMessage = errorText.slice(0, 200) || response.statusText;
    }
    throw new Error(`Anyscale fine-tuning failed (${response.status}): ${errorMessage}`);
  }

  const job = await safeJsonParse(response) as {
    id: string;
    status: string;
    created_at: number;
  };

  return {
    id: job.id,
    name: `Training Run ${new Date().toLocaleDateString()}`,
    config,
    status: mapAnyscaleStatus(job.status),
    datasetId: fileId,
    createdAt: new Date(job.created_at * 1000),
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
  // Anyscale jobs start automatically when created, so this just fetches the current status
  const status = await getTrainingStatus(runId);

  return {
    id: runId,
    status: 'running',
    startedAt: new Date(),
    progress: status.progress || {
      currentStep: 0,
      totalSteps: 100,
      currentEpoch: 0,
      totalEpochs: 3,
      loss: 0,
      lossHistory: [],
      eta: 'calculating...',
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
  fineTunedModel?: string;
  error?: string;
}> {
  const anyscaleKey = getApiKey('anyscale');
  if (!anyscaleKey) throw new Error('Anyscale API key not configured');

  const job = await fetchJson<{
    id: string;
    status: string;
    trained_tokens?: number;
    hyperparameters?: { n_epochs?: number };
    estimated_finish?: number;
    fine_tuned_model?: string;
    error?: { message?: string };
  }>(`${ANYSCALE_PROXY_URL}/fine_tuning/jobs/${runId}`, {
    method: 'GET',
    headers: {
      'X-Anyscale-Key': anyscaleKey,
    },
  });

  // Calculate progress from job events/metrics if available
  const trainedTokens = job.trained_tokens || 0;
  const totalTokens = job.hyperparameters?.n_epochs ? trainedTokens * job.hyperparameters.n_epochs : trainedTokens;
  const currentEpoch = Math.floor(trainedTokens / (totalTokens / (job.hyperparameters?.n_epochs || 1))) || 0;

  return {
    id: job.id,
    status: mapAnyscaleStatus(job.status),
    progress: {
      currentStep: trainedTokens,
      totalSteps: totalTokens || 100,
      currentEpoch: currentEpoch,
      totalEpochs: job.hyperparameters?.n_epochs || 3,
      loss: 0, // Anyscale doesn't expose loss in the job response directly
      lossHistory: [],
      eta: job.estimated_finish ? formatEta(new Date(job.estimated_finish * 1000)) : 'calculating...',
    },
    fineTunedModel: job.fine_tuned_model,
    error: job.error?.message,
  };
}

// Helper to format ETA
function formatEta(finishTime: Date): string {
  const now = new Date();
  const diffMs = finishTime.getTime() - now.getTime();
  if (diffMs <= 0) return 'finishing...';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `~${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  return `~${diffHours}h ${diffMins % 60}m`;
}

export async function cancelTrainingRun(runId: string): Promise<{
  id: string;
  status: 'cancelled';
}> {
  const anyscaleKey = getApiKey('anyscale');
  if (!anyscaleKey) throw new Error('Anyscale API key not configured');

  await fetchJson(`${ANYSCALE_PROXY_URL}/fine_tuning/jobs/${runId}/cancel`, {
    method: 'POST',
    headers: {
      'X-Anyscale-Key': anyscaleKey,
    },
  });

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
  fineTunedModel?: string;
}>> {
  const anyscaleKey = getApiKey('anyscale');
  if (!anyscaleKey) throw new Error('Anyscale API key not configured');

  const result = await fetchJson<{
    data: Array<{
      id: string;
      model: string;
      status: string;
      created_at: number;
      fine_tuned_model?: string;
    }>;
  }>(`${ANYSCALE_PROXY_URL}/fine_tuning/jobs`, {
    method: 'GET',
    headers: {
      'X-Anyscale-Key': anyscaleKey,
    },
  });

  return (result.data || []).map((job) => ({
    id: job.id,
    name: `Fine-tune ${job.model}`,
    status: mapAnyscaleStatus(job.status),
    createdAt: new Date(job.created_at * 1000),
    fineTunedModel: job.fine_tuned_model,
  }));
}

// Inference via Anyscale (for testing fine-tuned models)
export async function runInference(
  modelId: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<string> {
  const anyscaleKey = getApiKey('anyscale');
  if (!anyscaleKey) throw new Error('Anyscale API key not configured');

  const result = await fetchJson<{
    choices?: Array<{ message?: { content?: string } }>;
  }>(`${ANYSCALE_PROXY_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'X-Anyscale-Key': anyscaleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: 1024,
    }),
  });

  return result.choices?.[0]?.message?.content || '';
}
