import { useState, useCallback } from 'react';
import { Key, CheckCircle, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ApiKeysStatus } from '@/types';

export interface SettingsProps {
  apiKeysStatus: ApiKeysStatus;
  onSaveApiKey: (service: keyof ApiKeysStatus, key: string) => Promise<boolean>;
  onTestConnection: (service: keyof ApiKeysStatus) => Promise<boolean>;
  onBack: () => void;
}

interface ApiKeyInputProps {
  label: string;
  description: string;
  isConfigured: boolean;
  onSave: (key: string) => Promise<boolean>;
  onTest: () => Promise<boolean>;
}

function ApiKeyInput({ label, description, isConfigured, onSave, onTest }: ApiKeyInputProps) {
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const handleSave = useCallback(async () => {
    if (!value.trim()) return;
    setIsSaving(true);
    try {
      const success = await onSave(value);
      if (success) {
        setValue('');
        setTestResult(null);
      }
    } finally {
      setIsSaving(false);
    }
  }, [value, onSave]);

  const handleTest = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const success = await onTest();
      setTestResult(success);
    } finally {
      setIsTesting(false);
    }
  }, [onTest]);

  return (
    <div className="py-4 border-b border-border last:border-b-0">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-text-primary">{label}</h4>
            {isConfigured ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-muted text-success">
                Configured
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning-muted text-warning">
                Not Set
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        </div>
        {isConfigured && (
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : testResult === true ? (
              <CheckCircle className="w-4 h-4 text-success" />
            ) : testResult === false ? (
              <XCircle className="w-4 h-4 text-error" />
            ) : (
              'Test'
            )}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showValue ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isConfigured ? '••••••••••••••••' : `Enter ${label} API key`}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent pr-10 text-sm"
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
          className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </button>
      </div>
    </div>
  );
}

export function Settings({ apiKeysStatus, onSaveApiKey, onTestConnection }: SettingsProps) {
  const apiServices: { key: keyof ApiKeysStatus; label: string; description: string }[] = [
    {
      key: 'anthropic',
      label: 'Anthropic',
      description: 'Required for Claude AI agent interactions',
    },
    {
      key: 'elevenlabs',
      label: 'ElevenLabs',
      description: 'Required for voice transcription and text-to-speech',
    },
    {
      key: 'tinker',
      label: 'Tinker',
      description: 'Required for model fine-tuning and deployment',
    },
    {
      key: 'tonic',
      label: 'Tonic',
      description: 'Optional - for synthetic data generation',
    },
    {
      key: 'yutori',
      label: 'Yutori',
      description: 'Optional - for advanced training features',
    },
  ];

  const configuredCount = Object.values(apiKeysStatus).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">API Keys</h1>
        <p className="text-sm text-text-secondary mt-1">
          {configuredCount} of {apiServices.length} configured
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 p-8">
        <div className="max-w-2xl">
          {/* API Keys Card */}
          <div className="bg-surface border border-border rounded-xl">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-text-secondary" />
                <h2 className="font-medium text-text-primary">API Keys</h2>
              </div>
            </div>
            <div className="px-6">
              {apiServices.map((svc) => (
                <ApiKeyInput
                  key={svc.key}
                  label={svc.label}
                  description={svc.description}
                  isConfigured={apiKeysStatus[svc.key]}
                  onSave={(key) => onSaveApiKey(svc.key, key)}
                  onTest={() => onTestConnection(svc.key)}
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 text-center text-sm text-text-muted">
            <p>API keys are stored securely in your browser's local storage.</p>
            <p>They are only sent to the respective API services.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
