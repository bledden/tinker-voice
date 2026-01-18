import { useState, useCallback } from 'react';
import {
  parseIntent as apiParseIntent,
  generateSyntheticData as apiGenerateSyntheticData,
  generateSyntheticSample as apiGenerateSyntheticSample,
  validateData as apiValidateData,
  recommendConfig as apiRecommendConfig,
  SyntheticDataOptions,
} from '@/lib/api';
import {
  TrainingIntent,
  DataSet,
  ValidationReport,
  TrainingConfig,
} from '@/types';

export interface GenerationProgress {
  generated: number;
  total: number;
}

export interface GenerateSyntheticDataOptions {
  count?: number;
  reviewSamplesFirst?: boolean;
}

export interface UseAgentsReturn {
  // State
  isParsingIntent: boolean;
  isGeneratingData: boolean;
  isValidating: boolean;
  isRecommendingConfig: boolean;
  generationProgress: GenerationProgress | null;
  error: string | null;

  // Actions
  parseIntent: (transcript: string) => Promise<TrainingIntent | null>;
  generateSyntheticData: (intent: TrainingIntent, options?: GenerateSyntheticDataOptions) => Promise<DataSet | null>;
  generateSyntheticSample: (intent: TrainingIntent, count?: number) => Promise<Array<{ input: string; output: string }> | null>;
  validateData: (data: DataSet) => Promise<ValidationReport | null>;
  recommendConfig: (intent: TrainingIntent, data: DataSet) => Promise<TrainingConfig | null>;
  clearError: () => void;
}

export function useAgents(): UseAgentsReturn {
  const [isParsingIntent, setIsParsingIntent] = useState(false);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRecommendingConfig, setIsRecommendingConfig] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
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

  const generateSyntheticData = useCallback(async (
    intent: TrainingIntent,
    options?: GenerateSyntheticDataOptions
  ): Promise<DataSet | null> => {
    console.log('[useAgents] Starting generateSyntheticData with options:', options);
    setIsGeneratingData(true);
    setGenerationProgress(null);
    setError(null);

    const count = options?.count || 250;

    try {
      const apiOptions: SyntheticDataOptions = {
        count,
        batchSize: 50,
        onBatchComplete: (_batch, totalGenerated) => {
          setGenerationProgress({ generated: totalGenerated, total: count });
        },
      };

      const result = await apiGenerateSyntheticData({
        description: intent.description,
        taskType: intent.taskType,
        domain: intent.domain,
        inputFormat: intent.inputFormat,
        outputFormat: intent.outputFormat,
        examples: intent.examples || [],
      }, apiOptions);

      console.log('[useAgents] generateSyntheticData succeeded with', result.rows.length, 'rows');
      return result as DataSet;
    } catch (err) {
      console.error('[useAgents] generateSyntheticData failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate data');
      return null;
    } finally {
      setIsGeneratingData(false);
      setGenerationProgress(null);
    }
  }, []);

  const generateSyntheticSample = useCallback(async (
    intent: TrainingIntent,
    count: number = 25
  ): Promise<Array<{ input: string; output: string }> | null> => {
    console.log('[useAgents] Starting generateSyntheticSample');
    setIsGeneratingData(true);
    setError(null);
    try {
      const result = await apiGenerateSyntheticSample({
        description: intent.description,
        taskType: intent.taskType,
        domain: intent.domain,
        inputFormat: intent.inputFormat,
        outputFormat: intent.outputFormat,
        examples: intent.examples || [],
      }, count);
      console.log('[useAgents] generateSyntheticSample succeeded with', result.length, 'samples');
      return result;
    } catch (err) {
      console.error('[useAgents] generateSyntheticSample failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate samples');
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
    generationProgress,
    error,
    parseIntent,
    generateSyntheticData,
    generateSyntheticSample,
    validateData,
    recommendConfig,
    clearError,
  };
}
