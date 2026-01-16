import { useRef, useEffect, useState } from 'react';
import { Sparkles, Upload, AlertTriangle, Mic } from 'lucide-react';
import { VoiceButton } from '@/components/voice/VoiceButton';
import { UseVoiceReturn, TranscriptEntry, TrainingIntent } from '@/types';
import { hasApiKey } from '@/lib/api';

export interface ConversationProps {
  voice: UseVoiceReturn;
  intent: TrainingIntent | null;
  onProceed: (dataSource: 'generate' | 'upload') => void;
  isParsingIntent?: boolean;
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
    <div className="space-y-4">
      <div className="bg-surface-subtle border border-border rounded-xl px-4 py-3">
        <p className="text-sm text-text-primary">
          Would you like me to generate synthetic training data, or do you have a dataset to upload?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => onChoose('generate')}
          className="p-5 rounded-xl border border-border bg-surface hover:border-accent transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-2">
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
          className="p-5 rounded-xl border border-border bg-surface hover:border-accent transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-2">
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

export function Conversation({ voice, intent, onProceed, isParsingIntent }: ConversationProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [showDataChoice, setShowDataChoice] = useState(false);

  const hasRequiredKeys = hasApiKey('elevenlabs') && hasApiKey('anthropic');

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [voice.transcript.length, voice.currentTranscript, showDataChoice]);

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

  const hasMessages = voice.transcript.length > 0 || voice.currentTranscript;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Voice Session</h1>
          {intent && <p>{intent.taskType} • {intent.domain}</p>}
        </div>
        {intent && showDataChoice && (
          <span className="badge badge-success">Intent detected</span>
        )}
      </div>

      {/* Content area - flex-1 to take remaining space */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Empty state - vertically centered when no messages */}
          {!hasMessages && !showDataChoice && (
            <div className="h-full flex flex-col items-center justify-center px-6">
              {/* API key warning */}
              {!hasRequiredKeys && (
                <div className="w-full max-w-lg mb-8 flex items-start gap-3 bg-warning-muted border border-warning/20 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">API keys required</p>
                    <p className="text-sm text-text-secondary mt-1">
                      Configure your ElevenLabs and Anthropic API keys in Settings to enable voice interaction.
                    </p>
                  </div>
                </div>
              )}

              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
                <Mic className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-3 text-center">
                Describe what you want to train
              </h2>
              <p className="text-base text-text-secondary max-w-md text-center leading-relaxed">
                Example: "I want to classify customer emails into billing, support, and sales"
              </p>
            </div>
          )}

          {/* Messages area - when there are messages */}
          {(hasMessages || showDataChoice) && (
            <div className="max-w-2xl mx-auto px-6 md:px-8 py-6">
              {/* API key warning at top of messages */}
              {!hasRequiredKeys && (
                <div className="mb-6 flex items-start gap-3 bg-warning-muted border border-warning/20 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">API keys required</p>
                    <p className="text-sm text-text-secondary mt-1">
                      Configure your ElevenLabs and Anthropic API keys in Settings to enable voice interaction.
                    </p>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-4">
                {voice.transcript.map((entry) => (
                  <TranscriptMessage key={entry.id} entry={entry} />
                ))}

                {voice.currentTranscript && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl rounded-br-md bg-accent/80 text-white">
                      <p className="text-sm leading-relaxed">{voice.currentTranscript}</p>
                      <p className="text-xs opacity-70 mt-1">Listening...</p>
                    </div>
                  </div>
                )}

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

                {intent && showDataChoice && (
                  <div className="pt-4">
                    <div className="bg-success-muted border border-success/20 rounded-xl px-4 py-3 mb-4">
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">Understood:</span> {intent.description}
                      </p>
                    </div>
                    <DataSourceChoice onChoose={onProceed} />
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Voice control bar - fixed at bottom */}
        {!showDataChoice && (
          <div className="flex-shrink-0 border-t border-border bg-surface">
            <div className="max-w-2xl mx-auto px-6 md:px-8 py-8 flex flex-col items-center">
              <VoiceButton
                voiceState={voice.voiceState}
                onClick={handleVoiceClick}
                disabled={isParsingIntent || !hasRequiredKeys}
                size="lg"
              />
              <p className="mt-4 text-sm text-text-muted">
                {!hasRequiredKeys
                  ? 'Configure API keys to enable'
                  : voice.voiceState === 'listening'
                  ? 'Listening... tap to stop'
                  : voice.voiceState === 'processing'
                  ? 'Processing...'
                  : voice.voiceState === 'speaking'
                  ? 'Speaking...'
                  : 'Tap to speak'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
