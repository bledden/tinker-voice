import { useState, useCallback } from 'react';
import { Eye, EyeOff, Loader2, Check, CheckCircle2, Circle, Key } from 'lucide-react';
import { ApiKeysStatus, FinetuneProvider } from '@/types';
import { setApiKey, hasApiKey, FINETUNE_PROVIDERS, getFinetuneProvider, setFinetuneProvider } from '@/lib/api';

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
  placeholder?: string;
  onSave: (key: string) => Promise<boolean>;
}

function ApiKeyRow({ service, label, description, placeholder, onSave }: ApiKeyRowProps) {
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
    <div className="py-fluid-md border-b border-border last:border-b-0">
      <div className="flex items-start gap-fluid-md">
        {/* Status indicator */}
        <div className="pt-0.5 flex-shrink-0">
          {isConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-success" />
          ) : (
            <Circle className="w-5 h-5 text-text-muted" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-text-primary">{label}</span>
            {isConfigured && (
              <span className="text-xs font-medium text-success">Configured</span>
            )}
          </div>
          <p className="text-sm text-text-secondary mb-fluid-sm">{description}</p>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isConfigured ? '••••••••••••••••' : (placeholder || 'Enter API key')}
                className="w-full pr-10"
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
              className="btn btn-primary min-w-[80px]"
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

// Core services (always shown)
const coreServices: { key: keyof ApiKeysStatus; label: string; description: string }[] = [
  {
    key: 'openai',
    label: 'OpenAI',
    description: 'Powers voice transcription (Whisper) and text-to-speech',
  },
  {
    key: 'anthropic',
    label: 'Anthropic',
    description: 'Powers Claude AI for intent parsing and reasoning',
  },
  {
    key: 'yutori',
    label: 'Yutori',
    description: 'Web research agent for finding training data',
  },
];

export function Settings({ onSaveApiKey }: SettingsProps) {
  const [, setKeyVersion] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<FinetuneProvider>(getFinetuneProvider());

  // Get provider info for the selected provider
  const currentProviderInfo = FINETUNE_PROVIDERS.find(p => p.id === selectedProvider) || FINETUNE_PROVIDERS[0];

  // Count configured keys
  const coreConfigured = coreServices.filter(s => hasApiKey(s.key)).length;
  const finetuneConfigured = hasApiKey(selectedProvider);
  const totalConfigured = coreConfigured + (finetuneConfigured ? 1 : 0);
  const totalRequired = coreServices.length + 1; // core + 1 finetune provider

  const handleSave = useCallback(async (service: keyof ApiKeysStatus, key: string) => {
    const result = await onSaveApiKey(service, key);
    setKeyVersion(v => v + 1);
    return result;
  }, [onSaveApiKey]);

  const handleProviderChange = (provider: FinetuneProvider) => {
    setSelectedProvider(provider);
    setFinetuneProvider(provider);
    setKeyVersion(v => v + 1);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="page-header">
        <h1>Settings</h1>
        <p>{totalConfigured} of {totalRequired} API keys configured</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="page-fluid" style={{ justifyContent: 'flex-start' }}>
          <div className="content-fluid">
            {/* Progress indicator */}
            {totalConfigured < totalRequired && (
              <div className="mb-fluid-lg p-fluid-md rounded-xl bg-accent/5 border border-accent/20 flex items-center gap-fluid-md">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Key className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-base font-semibold text-text-primary">
                    {totalRequired - totalConfigured} API key{totalRequired - totalConfigured !== 1 ? 's' : ''} needed
                  </p>
                  <p className="text-sm text-text-secondary">
                    Configure the required API keys to get started with ChatMLE
                  </p>
                </div>
              </div>
            )}

            {/* Core Services */}
            <div className="mb-fluid-lg">
              <div className="flex items-center justify-between mb-fluid-sm">
                <h2 className="text-base font-semibold text-text-primary">Core Services</h2>
                <span className="text-sm text-text-muted">{coreConfigured} of {coreServices.length}</span>
              </div>
              <div className="card-fluid">
                {coreServices.map((svc) => (
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

            {/* Fine-tuning Provider Section */}
            <div className="mb-fluid-lg">
              <div className="flex items-center justify-between mb-fluid-sm">
                <h2 className="text-base font-semibold text-text-primary">Fine-tuning Provider</h2>
                <span className="text-sm text-text-muted">Choose one</span>
              </div>

              {/* Provider selector */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {FINETUNE_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange(provider.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedProvider === provider.id
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50 bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedProvider === provider.id
                          ? 'border-accent bg-accent'
                          : 'border-text-muted'
                      }`}>
                        {selectedProvider === provider.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="font-semibold text-text-primary">{provider.name}</span>
                      {hasApiKey(provider.id) && (
                        <CheckCircle2 className="w-4 h-4 text-success ml-auto" />
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mb-1">{provider.description}</p>
                    <p className="text-xs text-accent font-medium">{provider.freeCredits}</p>
                  </button>
                ))}
              </div>

              {/* API key input for selected provider */}
              <div className="card-fluid">
                <ApiKeyRow
                  service={selectedProvider}
                  label={`${currentProviderInfo.name} API Key`}
                  description={currentProviderInfo.pricing}
                  placeholder={currentProviderInfo.apiKeyPlaceholder}
                  onSave={(key) => handleSave(selectedProvider, key)}
                />
              </div>
            </div>

            {/* Info footer */}
            <p className="text-center text-sm text-text-muted leading-relaxed">
              Keys are stored in your browser's local storage and sent only to their respective APIs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
