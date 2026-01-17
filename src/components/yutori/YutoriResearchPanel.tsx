import { useState, useEffect } from 'react';
import { Globe, Search, ExternalLink, CheckCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import type { YutoriResearchTask, YutoriResearchResult, TrainingIntent } from '@/types';
import { researchTrainingData, getYutoriTaskStatus } from '@/lib/api';
import { hasApiKey } from '@/lib/api';

// Yutori brand colors
const YUTORI_PURPLE = '#8B5CF6';
const YUTORI_PURPLE_MUTED = 'rgba(139, 92, 246, 0.1)';

interface YutoriResearchPanelProps {
  intent: TrainingIntent | null;
  isGenerating: boolean;
  onResearchComplete?: (results: YutoriResearchResult[]) => void;
}

export function YutoriResearchPanel({
  intent,
  isGenerating,
  onResearchComplete,
}: YutoriResearchPanelProps) {
  const [task, setTask] = useState<YutoriResearchTask | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasYutoriKey = hasApiKey('yutori');

  // Start research when generating data
  useEffect(() => {
    if (isGenerating && intent && hasYutoriKey && !task && !isResearching) {
      startResearch();
    }
  }, [isGenerating, intent, hasYutoriKey]);

  // Poll for task status
  useEffect(() => {
    if (!task || task.status === 'completed' || task.status === 'failed') return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await getYutoriTaskStatus(task.taskId);
        setTask(prev => prev ? { ...prev, ...status } : null);

        if (status.status === 'completed' && status.results) {
          onResearchComplete?.(status.results);
        }
      } catch (err) {
        console.error('Failed to poll Yutori status:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [task?.taskId, task?.status, onResearchComplete]);

  async function startResearch() {
    if (!intent) return;

    setIsResearching(true);
    setError(null);

    try {
      const result = await researchTrainingData(intent);
      setTask({
        taskId: result.taskId,
        status: 'running',
        query: `${intent.description} in ${intent.domain}`,
        createdAt: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start research');
    } finally {
      setIsResearching(false);
    }
  }

  if (!hasYutoriKey) {
    return null;
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: YUTORI_PURPLE, backgroundColor: YUTORI_PURPLE_MUTED }}
    >
      {/* Header with Yutori branding */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: YUTORI_PURPLE }}
        >
          <Globe className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: YUTORI_PURPLE }}>
              Yutori Web Research
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-white/50" style={{ color: YUTORI_PURPLE }}>
              SPONSOR
            </span>
          </div>
          <p className="text-xs text-text-secondary truncate">
            AI-powered web research for training data discovery
          </p>
        </div>
        {task?.status === 'running' && (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: YUTORI_PURPLE }} />
        )}
        {task?.status === 'completed' && (
          <CheckCircle className="w-4 h-4" style={{ color: '#22c55e' }} />
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Status */}
        {!task && !isResearching && !error && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Search className="w-3.5 h-3.5" />
            <span>Will research web for training data examples when generation starts</span>
          </div>
        )}

        {isResearching && (
          <div className="flex items-center gap-2 text-xs" style={{ color: YUTORI_PURPLE }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Initiating web research...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-error">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        {task?.status === 'running' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs" style={{ color: YUTORI_PURPLE }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Researching: {task.query}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-white/30">
              <div
                className="h-full rounded-full animate-pulse"
                style={{ backgroundColor: YUTORI_PURPLE, width: '60%' }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {task?.status === 'completed' && task.results && task.results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-primary">
              Found {task.results.length} relevant sources:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {task.results.slice(0, 5).map((result, i) => (
                <div
                  key={i}
                  className="p-2 rounded bg-white/50 hover:bg-white/70 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium hover:underline flex items-center gap-1 truncate"
                        style={{ color: YUTORI_PURPLE }}
                      >
                        {result.title}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                      <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">
                        {result.snippet}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                      style={{
                        backgroundColor: YUTORI_PURPLE_MUTED,
                        color: YUTORI_PURPLE,
                      }}
                    >
                      {Math.round(result.relevanceScore * 100)}%
                    </span>
                  </div>
                  {result.dataPoints && result.dataPoints.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {result.dataPoints.slice(0, 3).map((point, j) => (
                        <span
                          key={j}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle text-text-secondary"
                        >
                          {point}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {task?.status === 'completed' && (!task.results || task.results.length === 0) && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Research complete - no additional sources found</span>
          </div>
        )}

        {task?.status === 'failed' && (
          <div className="flex items-center gap-2 text-xs text-error">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{task.error || 'Research failed'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
