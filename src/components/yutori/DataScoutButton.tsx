import { useState } from 'react';
import { Radar, Loader2, Check, Calendar, Bell } from 'lucide-react';
import type { TrainingIntent, YutoriScout } from '@/types';
import { createDataScout, hasApiKey } from '@/lib/api';

// Yutori brand colors
const YUTORI_PURPLE = '#8B5CF6';

interface DataScoutButtonProps {
  intent: TrainingIntent | null;
  onScoutCreated?: (scout: YutoriScout) => void;
}

export function DataScoutButton({ intent, onScoutCreated }: DataScoutButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [scout, setScout] = useState<YutoriScout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);

  const hasYutoriKey = hasApiKey('yutori');

  if (!hasYutoriKey || !intent) {
    return null;
  }

  async function handleCreateScout(schedule: 'hourly' | 'daily' | 'weekly' = 'daily') {
    if (!intent) return;

    setIsCreating(true);
    setError(null);
    setShowScheduleMenu(false);

    try {
      const result = await createDataScout({ ...intent, schedule });
      const newScout: YutoriScout = {
        scoutId: result.scoutId,
        status: 'active',
        query: `${intent.description} in ${intent.domain}`,
        schedule,
        createdAt: new Date(),
        nextRunAt: getNextRunTime(schedule),
        findingsCount: 0,
      };
      setScout(newScout);
      onScoutCreated?.(newScout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scout');
    } finally {
      setIsCreating(false);
    }
  }

  function getNextRunTime(schedule: 'hourly' | 'daily' | 'weekly'): Date {
    const now = new Date();
    switch (schedule) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  if (scout) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
        style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: YUTORI_PURPLE }}
        >
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-text-primary text-xs">Data Scout Active</span>
            <Bell className="w-3 h-3" style={{ color: YUTORI_PURPLE }} />
          </div>
          <p className="text-[10px] text-text-secondary">
            Monitoring {scout.schedule} · Next: {scout.nextRunAt?.toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowScheduleMenu(!showScheduleMenu)}
        disabled={isCreating}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
        style={{
          backgroundColor: YUTORI_PURPLE,
          color: 'white',
        }}
      >
        {isCreating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Radar className="w-4 h-4" />
        )}
        <span>Create Data Scout</span>
      </button>

      {showScheduleMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowScheduleMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-medium text-text-primary">Monitor Schedule</p>
              <p className="text-[10px] text-text-secondary">
                Yutori will notify you of new data sources
              </p>
            </div>
            <button
              onClick={() => handleCreateScout('hourly')}
              className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-subtle transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-text-muted" />
              <span>Every hour</span>
            </button>
            <button
              onClick={() => handleCreateScout('daily')}
              className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-subtle transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-text-muted" />
              <span>Daily</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-muted text-accent ml-auto">
                Recommended
              </span>
            </button>
            <button
              onClick={() => handleCreateScout('weekly')}
              className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-subtle transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-text-muted" />
              <span>Weekly</span>
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="absolute top-full mt-1 text-xs text-error">{error}</p>
      )}
    </div>
  );
}
