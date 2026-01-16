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
  createRun: (config: TrainingConfig, datasetId: string) => Promise<TrainingRun | null>;
  startRun: (runId: string) => Promise<void>;
  cancelRun: (runId: string) => Promise<void>;
  refreshRuns: () => Promise<void>;
  setActiveRun: (run: TrainingRun | null) => void;
  clearError: () => void;
}

export function useTraining(): UseTrainingReturn {
  const [runs, setRuns] = useState<TrainingRun[]>([]);
  const [activeRun, setActiveRun] = useState<TrainingRun | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

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

  const createRun = useCallback(async (config: TrainingConfig, datasetId: string): Promise<TrainingRun | null> => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await apiCreateTrainingRun(config, datasetId);
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
