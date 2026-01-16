import { useState, useCallback } from 'react';
import { Eye, EyeOff, Loader2, Check, CheckCircle2, Circle } from 'lucide-react';
import { ApiKeysStatus } from '@/types';
import { setApiKey, hasApiKey } from '@/lib/api';

export interface SettingsProps {
  apiKeysStatus: ApiKeysStatus;
  onSaveApiKey: (service: keyof ApiKeysStatus, key: string) => Promise<boolean>;
  onTestConnection: (service: keyof ApiKeysStatus) => Promise<boolean>;
  onBack: () => void;
}

interface ApiKeyRowProps {
  service: keyof ApiKeysStatus;
  label: string;
  description: string;
  onSave: (key: string) => Promise<boolean>;
}

function ApiKeyRow({ service, label, description, onSave }: ApiKeyRowProps) {
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isConfigured = hasApiKey(service);

  const handleSave = useCallback(async () => {
    if (!value.trim()) return;
    setIsSaving(true);
    try {
      setApiKey(service, value.trim());
      await onSave(value);
      setValue('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [value, service, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      handleSave();
    }
  };

  return (
    <div className="py-4 border-b border-border-subtle last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="pt-0.5">
          {isConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-success" />
          ) : (
            <Circle className="w-5 h-5 text-text-muted" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-text-primary">{label}</span>
            {isConfigured && (
              <span className="text-xs text-success">Configured</span>
            )}
          </div>
          <p className="text-xs text-text-muted mb-3">{description}</p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isConfigured ? '••••••••••••' : `Enter API key`}
                className="pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                aria-label={showValue ? 'Hide API key' : 'Show API key'}
              >
                {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={!value.trim() || isSaving}
              className="btn btn-primary btn-sm min-w-[64px]"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const apiServices: { key: keyof ApiKeysStatus; label: string; description: string; required: boolean }[] = [
  {
    key: 'anthropic',
    label: 'Anthropic',
    description: 'Powers Claude AI for intent parsing and data generation',
    required: true,
  },
  {
    key: 'elevenlabs',
    label: 'ElevenLabs',
    description: 'Enables voice transcription and text-to-speech',
    required: true,
  },
  {
    key: 'tinker',
    label: 'Tinker',
    description: 'Runs model fine-tuning and deployment jobs',
    required: true,
  },
  {
    key: 'tonic',
    label: 'Tonic',
    description: 'Alternative synthetic data generation',
    required: false,
  },
  {
    key: 'yutori',
    label: 'Yutori',
    description: 'Advanced training and evaluation features',
    required: false,
  },
];

export function Settings({ onSaveApiKey }: SettingsProps) {
  const [, setKeyVersion] = useState(0);

  const configuredCount = apiServices.filter(s => hasApiKey(s.key)).length;
  const requiredServices = apiServices.filter(s => s.required);
  const optionalServices = apiServices.filter(s => !s.required);
  const requiredConfigured = requiredServices.filter(s => hasApiKey(s.key)).length;

  const handleSave = useCallback(async (service: keyof ApiKeysStatus, key: string) => {
    const result = await onSaveApiKey(service, key);
    setKeyVersion(v => v + 1);
    return result;
  }, [onSaveApiKey]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="page-header">
        <h1>API Keys</h1>
        <p>{configuredCount} of {apiServices.length} configured</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 md:px-8 py-6">
          {/* Progress indicator */}
          {requiredConfigured < requiredServices.length && (
            <div className="mb-6 p-4 rounded-lg bg-accent-muted border border-accent/20">
              <p className="text-sm text-text-primary">
                <span className="font-medium">{requiredServices.length - requiredConfigured} required keys</span> still needed to get started
              </p>
            </div>
          )}

          {/* Required section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">Required</h2>
              <span className="text-xs text-text-muted">{requiredConfigured}/{requiredServices.length}</span>
            </div>
            <div className="card">
              <div className="px-4">
                {requiredServices.map((svc) => (
                  <ApiKeyRow
                    key={svc.key}
                    service={svc.key}
                    label={svc.label}
                    description={svc.description}
                    onSave={(key) => handleSave(svc.key, key)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Optional section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">Optional</h2>
              <span className="text-xs text-text-muted">Additional integrations</span>
            </div>
            <div className="card">
              <div className="px-4">
                {optionalServices.map((svc) => (
                  <ApiKeyRow
                    key={svc.key}
                    service={svc.key}
                    label={svc.label}
                    description={svc.description}
                    onSave={(key) => handleSave(svc.key, key)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Info footer */}
          <p className="text-center text-xs text-text-muted leading-relaxed">
            Keys are stored in your browser's local storage and sent only to their respective APIs.
          </p>
        </div>
      </div>
    </div>
  );
}
