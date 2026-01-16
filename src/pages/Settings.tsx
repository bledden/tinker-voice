import { useState, useCallback } from 'react';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
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
  required: boolean;
  onSave: (key: string) => Promise<boolean>;
}

function ApiKeyRow({ service, label, description, required, onSave }: ApiKeyRowProps) {
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

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="font-medium text-text-primary">{label}</span>
          {isConfigured ? (
            <span className="badge badge-success">Configured</span>
          ) : (
            <span className="badge badge-warning">Not set</span>
          )}
        </div>
        {!required && <span className="text-xs text-text-muted">Optional</span>}
      </div>
      <p className="text-sm text-text-muted mb-3">{description}</p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showValue ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isConfigured ? '••••••••••••••••' : `Enter ${label} API key`}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!value.trim() || isSaving}
          className="btn btn-secondary btn-sm min-w-[72px]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            'Save'
          )}
        </button>
      </div>
    </div>
  );
}

const apiServices: { key: keyof ApiKeysStatus; label: string; description: string; required: boolean }[] = [
  {
    key: 'anthropic',
    label: 'Anthropic',
    description: 'Required for Claude AI agent interactions',
    required: true,
  },
  {
    key: 'elevenlabs',
    label: 'ElevenLabs',
    description: 'Required for voice transcription and text-to-speech',
    required: true,
  },
  {
    key: 'tinker',
    label: 'Tinker',
    description: 'Required for model fine-tuning and deployment',
    required: true,
  },
  {
    key: 'tonic',
    label: 'Tonic',
    description: 'For synthetic data generation',
    required: false,
  },
  {
    key: 'yutori',
    label: 'Yutori',
    description: 'For advanced training features',
    required: false,
  },
];

export function Settings({ onSaveApiKey }: SettingsProps) {
  // Force re-render when keys change by tracking a version
  const [, setKeyVersion] = useState(0);

  // Get counts from localStorage directly for accuracy
  const configuredCount = apiServices.filter(s => hasApiKey(s.key)).length;
  const requiredCount = apiServices.filter(s => s.required).length;
  const requiredConfigured = apiServices.filter(s => s.required && hasApiKey(s.key)).length;

  // Wrap onSave to trigger re-render
  const handleSave = useCallback(async (service: keyof ApiKeysStatus, key: string) => {
    const result = await onSaveApiKey(service, key);
    setKeyVersion(v => v + 1); // Force re-render to update counts
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
        <div className="max-w-xl mx-auto px-8 py-8">
          {/* Required section */}
          <div className="card mb-6">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-medium text-text-primary">Required</h2>
              <p className="text-sm text-text-muted">{requiredConfigured} of {requiredCount} configured</p>
            </div>
            <div className="px-5">
              {apiServices.filter(s => s.required).map((svc) => (
                <ApiKeyRow
                  key={svc.key}
                  service={svc.key}
                  label={svc.label}
                  description={svc.description}
                  required={svc.required}
                  onSave={(key) => handleSave(svc.key, key)}
                />
              ))}
            </div>
          </div>

          {/* Optional section */}
          <div className="card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-medium text-text-primary">Optional</h2>
              <p className="text-sm text-text-muted">Additional integrations</p>
            </div>
            <div className="px-5">
              {apiServices.filter(s => !s.required).map((svc) => (
                <ApiKeyRow
                  key={svc.key}
                  service={svc.key}
                  label={svc.label}
                  description={svc.description}
                  required={svc.required}
                  onSave={(key) => handleSave(svc.key, key)}
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <p className="mt-6 text-center text-sm text-text-muted">
            Keys are stored in your browser's local storage and sent only to their respective APIs.
          </p>
        </div>
      </div>
    </div>
  );
}
