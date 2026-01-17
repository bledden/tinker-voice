import { useRef, useEffect, useState } from 'react';
import { MessageSquare, Sparkles, CheckCircle, Zap, Upload, AlertTriangle } from 'lucide-react';
import { VoiceButton } from '@/components/voice/VoiceButton';
import { UseVoiceReturn, TranscriptEntry, TrainingIntent } from '@/types';
import { hasApiKey } from '@/lib/api';

export interface HomeProps {
  voice: UseVoiceReturn;
  intent: TrainingIntent | null;
  isParsingIntent: boolean;
  error: string | null;
  onProceed: (dataSource: 'generate' | 'upload') => void;
}

function TranscriptMessage({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl
          ${isUser
            ? 'bg-accent text-white rounded-br-md'
            : 'bg-surface border border-border text-text-primary rounded-bl-md'
          }
        `}
      >
        <p className="text-sm leading-relaxed">{entry.text}</p>
      </div>
    </div>
  );
}

interface DataSourceChoiceProps {
  onChoose: (choice: 'generate' | 'upload') => void;
}

function DataSourceChoice({ onChoose }: DataSourceChoiceProps) {
  return (
    <div className="stack-fluid">
      <div className="bg-surface-subtle border border-border rounded-xl p-fluid-md">
        <p className="text-sm text-text-primary">
          Would you like me to generate synthetic training data, or do you have a dataset to upload?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-fluid-sm">
        <button
          onClick={() => onChoose('generate')}
          className="card-fluid hover:border-accent transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-fluid-xs">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <span className="font-semibold text-text-primary text-sm">Generate Data</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Create synthetic training examples with AI
          </p>
        </button>

        <button
          onClick={() => onChoose('upload')}
          className="card-fluid hover:border-accent transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-fluid-xs">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-accent" />
            </div>
            <span className="font-semibold text-text-primary text-sm">Upload Dataset</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Use your own CSV or JSONL file
          </p>
        </button>
      </div>
    </div>
  );
}

export function Home({ voice, intent, isParsingIntent, error, onProceed }: HomeProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [showDataChoice, setShowDataChoice] = useState(false);

  const hasRequiredKeys = hasApiKey('elevenlabs') && hasApiKey('anthropic');
  const hasMessages = voice.transcript.length > 0 || voice.currentTranscript;

  // Auto-scroll when content changes
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [voice.transcript.length, voice.currentTranscript, showDataChoice]);

  // Show data choice after intent is parsed
  useEffect(() => {
    if (intent && !isParsingIntent) {
      const timer = setTimeout(() => setShowDataChoice(true), 300);
      return () => clearTimeout(timer);
    }
  }, [intent, isParsingIntent]);

  const handleVoiceClick = () => {
    if (voice.voiceState === 'idle') {
      voice.startListening();
    } else if (voice.voiceState === 'listening') {
      voice.stopListening();
    }
  };

  const voiceStatusText = !hasRequiredKeys
    ? 'Configure API keys to enable'
    : voice.voiceState === 'listening'
    ? 'Listening... tap to stop'
    : voice.voiceState === 'processing'
    ? 'Processing...'
    : voice.voiceState === 'speaking'
    ? 'Speaking...'
    : 'Tap to speak';

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="page-fluid">
        <div className="content-fluid">
          {/* Initial state - no messages yet */}
          {!hasMessages && !showDataChoice && (
            <>
              {/* Hero section */}
              <div className="layout-centered mb-fluid-md">
                <h1 className="text-fluid-3xl font-semibold text-text-primary mb-fluid-xs tracking-tight leading-tight">
                  Fine-tune models with your voice
                </h1>
                <p className="text-fluid-base text-text-secondary max-w-lg leading-relaxed">
                  Describe your ML task, generate training data, and launch fine-tuning — all through natural conversation.
                </p>
              </div>

              {/* API key warning */}
              {!hasRequiredKeys && (
                <div className="w-full max-w-md mx-auto mb-fluid-md flex items-start gap-3 bg-warning-muted border border-warning/20 rounded-xl p-fluid-md text-left">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">API keys required</p>
                    <p className="text-sm text-text-secondary mt-1">
                      Configure your ElevenLabs and Anthropic API keys in Settings to enable voice.
                    </p>
                  </div>
                </div>
              )}

              {/* CTA section with voice button */}
              <div className="layout-centered mb-fluid-lg">
                <VoiceButton
                  voiceState={voice.voiceState}
                  onClick={handleVoiceClick}
                  disabled={isParsingIntent || !hasRequiredKeys}
                  size="lg"
                />
                <p className="text-sm text-text-muted mt-fluid-sm">{voiceStatusText}</p>
                <p className="text-xs text-text-muted mt-2 max-w-sm text-center">
                  Example: "I want to classify customer support tickets into billing, technical, and general inquiries"
                </p>
              </div>

              {/* How it works */}
              <div className="mb-fluid-sm">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-fluid-sm text-center">
                  How it works
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-fluid-sm">
                  <Step
                    number={1}
                    title="Describe"
                    description="Tell us what you want to train"
                    icon={<MessageSquare className="w-5 h-5" />}
                  />
                  <Step
                    number={2}
                    title="Generate"
                    description="We create training data"
                    icon={<Sparkles className="w-5 h-5" />}
                  />
                  <Step
                    number={3}
                    title="Review"
                    description="Validate your dataset"
                    icon={<CheckCircle className="w-5 h-5" />}
                  />
                  <Step
                    number={4}
                    title="Train"
                    description="Launch fine-tuning"
                    icon={<Zap className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-fluid-sm">
                <Feature
                  title="Voice-First"
                  description="Speak naturally to describe your training intent"
                />
                <Feature
                  title="Synthetic Data"
                  description="Generate quality training examples with AI"
                />
                <Feature
                  title="Smart Config"
                  description="Optimized hyperparameters for your task"
                />
              </div>
            </>
          )}

          {/* Conversation state - messages present */}
          {(hasMessages || showDataChoice) && (
            <div className="content-fluid-narrow mx-auto">
              {/* Header showing intent status */}
              {intent && (
                <div className="flex items-center justify-between mb-fluid-md pb-fluid-sm border-b border-border">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">Voice Session</h2>
                    <p className="text-sm text-text-secondary">{intent.taskType} • {intent.domain}</p>
                  </div>
                  {showDataChoice && (
                    <span className="badge badge-success">Intent detected</span>
                  )}
                </div>
              )}

              <div className="stack-fluid">
                {/* Messages */}
                {voice.transcript.map((entry) => (
                  <TranscriptMessage key={entry.id} entry={entry} />
                ))}

                {/* Current transcript (while listening) */}
                {voice.currentTranscript && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl rounded-br-md bg-accent/80 text-white">
                      <p className="text-sm leading-relaxed">{voice.currentTranscript}</p>
                      <p className="text-xs opacity-70 mt-1">Listening...</p>
                    </div>
                  </div>
                )}

                {/* Parsing indicator */}
                {isParsingIntent && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-surface border border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <p className="text-sm text-text-muted">Analyzing your request...</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error display */}
                {error && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3 bg-error-muted border border-error/20 rounded-xl p-fluid-md max-w-[80%]">
                      <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">Something went wrong</p>
                        <p className="text-sm text-text-secondary mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Intent understood + data source choice */}
                {intent && showDataChoice && (
                  <div className="stack-fluid pt-fluid-sm">
                    <div className="bg-success-muted border border-success/20 rounded-xl p-fluid-md">
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">Understood:</span> {intent.description}
                      </p>
                    </div>
                    <DataSourceChoice onChoose={onProceed} />
                  </div>
                )}

                {/* Voice button - when not showing data choice */}
                {!showDataChoice && (
                  <div className="layout-centered pt-fluid-lg gap-fluid-sm">
                    <VoiceButton
                      voiceState={voice.voiceState}
                      onClick={handleVoiceClick}
                      disabled={isParsingIntent || !hasRequiredKeys}
                      size="lg"
                    />
                    <p className="text-sm text-text-muted">{voiceStatusText}</p>
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function Step({ number, title, description, icon }: StepProps) {
  return (
    <div className="card-fluid relative flex flex-col items-center text-center pt-[clamp(1rem,2vw,1.5rem)]">
      {/* Step number badge */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center shadow-sm">
        {number}
      </div>
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-fluid-xs">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="text-xs text-text-muted leading-snug">{description}</p>
    </div>
  );
}

interface FeatureProps {
  title: string;
  description: string;
}

function Feature({ title, description }: FeatureProps) {
  return (
    <div className="card-fluid">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="text-xs text-text-secondary leading-snug">{description}</p>
    </div>
  );
}
