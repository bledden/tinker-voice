import { useState, useCallback, useEffect, useRef } from 'react';
import {
  createTrainingRun as apiCreateTrainingRun,
  startTrainingRun as apiStartTrainingRun,
  cancelTrainingRun as apiCancelTrainingRun,
  getTrainingStatus as apiGetTrainingStatus,
  listTrainingRuns as apiListTrainingRuns,
} from '@/lib/api';
import {
  TrainingRun,
  TrainingConfig,
} from '@/types';

export interface UseTrainingReturn {
  // State
  runs: TrainingRun[];
  activeRun: TrainingRun | null;
  isCreating: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  createRun: (config: TrainingConfig, datasetId: string, trainingData?: Array<{ input: string; output: string }>) => Promise<TrainingRun | null>;
  startRun: (runId: string) => Promise<void>;
  cancelRun: (runId: string) => Promise<void>;
  refreshRuns: () => Promise<void>;
  setActiveRun: (run: TrainingRun | null) => void;
  clearError: () => void;
}

// LocalStorage keys
const STORAGE_KEYS = {
  runs: 'chatmle_training_runs',
  activeRun: 'chatmle_active_run',
};

// Helper to serialize/deserialize dates in training runs
function serializeRun(run: TrainingRun): string {
  return JSON.stringify({
    ...run,
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString(),
    completedAt: run.completedAt?.toISOString(),
  });
}

function deserializeRun(json: string): TrainingRun {
  const data = JSON.parse(json);
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
    completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
  };
}

function loadRunsFromStorage(): TrainingRun[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.runs);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((json: string) => deserializeRun(json));
    }
  } catch (e) {
    console.warn('Failed to load training runs from storage:', e);
  }
  return [];
}

function loadActiveRunFromStorage(): TrainingRun | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.activeRun);
    if (stored) {
      return deserializeRun(stored);
    }
  } catch (e) {
    console.warn('Failed to load active run from storage:', e);
  }
  return null;
}

function saveRunsToStorage(runs: TrainingRun[]): void {
  try {
    const serialized = runs.map(serializeRun);
    localStorage.setItem(STORAGE_KEYS.runs, JSON.stringify(serialized));
  } catch (e) {
    console.warn('Failed to save training runs to storage:', e);
  }
}

function saveActiveRunToStorage(run: TrainingRun | null): void {
  try {
    if (run) {
      localStorage.setItem(STORAGE_KEYS.activeRun, serializeRun(run));
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeRun);
    }
  } catch (e) {
    console.warn('Failed to save active run to storage:', e);
  }
}

export function useTraining(): UseTrainingReturn {
  const [runs, setRuns] = useState<TrainingRun[]>(() => loadRunsFromStorage());
  const [activeRun, setActiveRun] = useState<TrainingRun | null>(() => loadActiveRunFromStorage());
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  // Persist runs to localStorage whenever they change
  useEffect(() => {
    saveRunsToStorage(runs);
  }, [runs]);

  // Persist active run to localStorage whenever it changes
  useEffect(() => {
    saveActiveRunToStorage(activeRun);
  }, [activeRun]);

  // Poll for active run status
  useEffect(() => {
    if (activeRun && activeRun.status === 'running') {
      pollingRef.current = window.setInterval(async () => {
        try {
          const result = await apiGetTrainingStatus(activeRun.id);
          const updatedRun: TrainingRun = {
            ...activeRun,
            status: result.status,
            progress: result.progress,
            fineTunedModel: result.fineTunedModel,
            completedAt: result.status === 'completed' ? new Date() : activeRun.completedAt,
            error: result.error,
          };

          setActiveRun(updatedRun);
          setRuns(prev => prev.map(r => r.id === updatedRun.id ? updatedRun : r));

          // Stop polling if no longer running
          if (result.status !== 'running') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        } catch (err) {
          console.error('Failed to fetch training status:', err);
        }
      }, 2000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }
  }, [activeRun?.id, activeRun?.status]);

  const createRun = useCallback(async (config: TrainingConfig, datasetId: string, trainingData?: Array<{ input: string; output: string }>): Promise<TrainingRun | null> => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await apiCreateTrainingRun(config, datasetId, trainingData);
      const run: TrainingRun = {
        id: result.id,
        name: result.name,
        config,
        status: result.status,
        datasetId: result.datasetId,
        createdAt: new Date(result.createdAt),
      };
      setRuns(prev => [...prev, run]);
      return run;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create training run');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const startRun = useCallback(async (runId: string): Promise<void> => {
    setError(null);
    try {
      const result = await apiStartTrainingRun(runId);
      const existingRun = runs.find(r => r.id === runId);
      if (existingRun) {
        const updatedRun: TrainingRun = {
          ...existingRun,
          status: result.status,
          startedAt: new Date(result.startedAt),
          progress: result.progress,
        };
        setActiveRun(updatedRun);
        setRuns(prev => prev.map(r => r.id === runId ? updatedRun : r));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training');
    }
  }, [runs]);

  const cancelRun = useCallback(async (runId: string): Promise<void> => {
    setError(null);
    try {
      const result = await apiCancelTrainingRun(runId);
      const existingRun = runs.find(r => r.id === runId);
      if (existingRun) {
        const updatedRun: TrainingRun = {
          ...existingRun,
          status: result.status,
        };
        setActiveRun(updatedRun);
        setRuns(prev => prev.map(r => r.id === runId ? updatedRun : r));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel training');
    }
  }, [runs]);

  const refreshRuns = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiListTrainingRuns();
      const runsList: TrainingRun[] = result.map(r => ({
        id: r.id,
        name: r.name,
        config: { model: '', learningRate: 0, epochs: 0, batchSize: 0, warmupSteps: 0, trainingType: 'lora', estimatedCost: 0, estimatedTime: '', id: '' },
        status: r.status,
        datasetId: '',
        createdAt: new Date(r.createdAt),
      }));
      setRuns(runsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load training runs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    runs,
    activeRun,
    isCreating,
    isLoading,
    error,
    createRun,
    startRun,
    cancelRun,
    refreshRuns,
    setActiveRun,
    clearError,
  };
}
