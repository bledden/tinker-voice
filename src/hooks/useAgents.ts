import { useState, useCallback } from 'react';
import {
  parseIntent as apiParseIntent,
  generateSyntheticData as apiGenerateSyntheticData,
  validateData as apiValidateData,
  recommendConfig as apiRecommendConfig,
} from '@/lib/api';
import {
  TrainingIntent,
  DataSet,
  ValidationReport,
  TrainingConfig,
} from '@/types';

export interface UseAgentsReturn {
  // State
  isParsingIntent: boolean;
  isGeneratingData: boolean;
  isValidating: boolean;
  isRecommendingConfig: boolean;
  error: string | null;

  // Actions
  parseIntent: (transcript: string) => Promise<TrainingIntent | null>;
  generateSyntheticData: (intent: TrainingIntent) => Promise<DataSet | null>;
  validateData: (data: DataSet) => Promise<ValidationReport | null>;
  recommendConfig: (intent: TrainingIntent, data: DataSet) => Promise<TrainingConfig | null>;
  clearError: () => void;
}

export function useAgents(): UseAgentsReturn {
  const [isParsingIntent, setIsParsingIntent] = useState(false);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRecommendingConfig, setIsRecommendingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseIntent = useCallback(async (transcript: string): Promise<TrainingIntent | null> => {
    setIsParsingIntent(true);
    setError(null);
    try {
      const result = await apiParseIntent(transcript);
      return result as TrainingIntent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse intent');
      return null;
    } finally {
      setIsParsingIntent(false);
    }
  }, []);

  const generateSyntheticData = useCallback(async (intent: TrainingIntent): Promise<DataSet | null> => {
    console.log('[useAgents] Starting generateSyntheticData');
    setIsGeneratingData(true);
    setError(null);
    try {
      const result = await apiGenerateSyntheticData({
        description: intent.description,
        taskType: intent.taskType,
        domain: intent.domain,
        inputFormat: intent.inputFormat,
        outputFormat: intent.outputFormat,
        examples: intent.examples || [],
      });
      console.log('[useAgents] generateSyntheticData succeeded with', result.rows.length, 'rows');
      return result as DataSet;
    } catch (err) {
      console.error('[useAgents] generateSyntheticData failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate data');
      return null;
    } finally {
      setIsGeneratingData(false);
    }
  }, []);

  const validateData = useCallback(async (data: DataSet): Promise<ValidationReport | null> => {
    console.log('[useAgents] Starting validateData with', data.rows.length, 'rows');
    setIsValidating(true);
    setError(null);
    try {
      const result = await apiValidateData(data);
      console.log('[useAgents] validateData succeeded:', result);
      return result as ValidationReport;
    } catch (err) {
      console.error('[useAgents] validateData failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to validate data');
      return null;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const recommendConfig = useCallback(async (intent: TrainingIntent, data: DataSet): Promise<TrainingConfig | null> => {
    console.log('[useAgents] Starting recommendConfig with', data.rows.length, 'rows');
    setIsRecommendingConfig(true);
    setError(null);
    try {
      const result = await apiRecommendConfig(intent, data.rows.length);
      console.log('[useAgents] recommendConfig succeeded:', result);
      return result as TrainingConfig;
    } catch (err) {
      console.error('[useAgents] recommendConfig failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to recommend config');
      return null;
    } finally {
      setIsRecommendingConfig(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isParsingIntent,
    isGeneratingData,
    isValidating,
    isRecommendingConfig,
    error,
    parseIntent,
    generateSyntheticData,
    validateData,
    recommendConfig,
    clearError,
  };
}
