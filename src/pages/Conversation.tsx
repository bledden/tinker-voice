import { useRef, useEffect, useState } from 'react';
import { ArrowRight, MessageSquare, Sparkles, Upload } from 'lucide-react';
import { VoiceButton } from '@/components/voice/VoiceButton';
import { UseVoiceReturn, TranscriptEntry, TrainingIntent } from '@/types';

export interface ConversationProps {
  voice: UseVoiceReturn;
  intent: TrainingIntent | null;
  onProceed: (dataSource: 'generate' | 'upload') => void;
  isParsingIntent?: boolean;
}

function TranscriptMessage({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`
          max-w-[80%] px-5 py-4 rounded-2xl
          ${isUser
            ? 'gradient-bg text-white rounded-br-md shadow-md'
            : 'bg-surface border border-border text-text-primary rounded-bl-md'
          }
        `}
      >
        <p className="text-sm leading-relaxed">{entry.text}</p>
        <p className={`text-xs mt-2 ${isUser ? 'opacity-70' : 'text-text-muted'}`}>
          {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

interface DataSourceChoiceProps {
  onChoose: (choice: 'generate' | 'upload') => void;
}

function DataSourceChoice({ onChoose }: DataSourceChoiceProps) {
  return (
    <div className="animate-slide-up">
      {/* System message */}
      <div className="flex justify-start mb-6">
        <div className="max-w-[85%] px-5 py-4 rounded-2xl bg-accent-muted border border-accent/20 rounded-bl-md">
          <p className="text-sm text-text-primary leading-relaxed">
            Great! I understand what you want to train. Now, would you like me to <strong>generate synthetic training data</strong> based on your description, or do you have your own <strong>dataset to upload</strong>?
          </p>
        </div>
      </div>

      {/* Choice cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <button
          onClick={() => onChoose('generate')}
          className="group card card-interactive p-6 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-success-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6 text-success" />
          </div>
          <h3 className="font-semibold text-text-primary mb-2">Generate Data</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            I'll create synthetic training examples tailored to your use case using AI.
          </p>
          <div className="mt-4 flex items-center gap-2 text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => onChoose('upload')}
          className="group card card-interactive p-6 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-info-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-info" />
          </div>
          <h3 className="font-semibold text-text-primary mb-2">Upload Dataset</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Upload your own CSV or JSONL file with input/output training pairs.
          </p>
          <div className="mt-4 flex items-center gap-2 text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}

export function Conversation({ voice, intent, onProceed, isParsingIntent }: ConversationProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [showDataChoice, setShowDataChoice] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [voice.transcript.length, voice.currentTranscript, showDataChoice]);

  // Show data choice when intent is parsed
  useEffect(() => {
    if (intent && !isParsingIntent) {
      // Small delay for better UX
      const timer = setTimeout(() => setShowDataChoice(true), 500);
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

  const handleDataSourceChoice = (choice: 'generate' | 'upload') => {
    onProceed(choice);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-muted flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Voice Session</h1>
            <p className="text-sm text-text-muted">Describe what you want to train</p>
          </div>
        </div>
        {intent && showDataChoice && (
          <div className="flex items-center gap-2">
            <span className="badge badge-success">Intent Detected</span>
          </div>
        )}
      </header>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {voice.transcript.length === 0 && !voice.currentTranscript && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-3">Start speaking</h2>
              <p className="text-text-secondary max-w-md mx-auto leading-relaxed">
                Describe what you want to train your model to do. Be specific about the task, inputs, and expected outputs.
              </p>
              <div className="mt-6 p-4 rounded-xl bg-surface border border-border max-w-md mx-auto">
                <p className="text-sm text-text-muted mb-2">Example:</p>
                <p className="text-sm text-text-primary italic">
                  "I want to train a model that classifies customer support emails into categories like billing, technical issue, feature request, and general inquiry"
                </p>
              </div>
            </div>
          )}

          {voice.transcript.map((entry) => (
            <TranscriptMessage key={entry.id} entry={entry} />
          ))}

          {/* Live transcription */}
          {voice.currentTranscript && (
            <div className="flex justify-end animate-fade-in">
              <div className="max-w-[80%] px-5 py-4 rounded-2xl bg-accent/30 text-accent-hover rounded-br-md border border-accent/20">
                <p className="text-sm">{voice.currentTranscript}</p>
                <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Listening...
                </div>
              </div>
            </div>
          )}

          {/* Intent Preview */}
          {intent && !showDataChoice && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[85%] px-5 py-4 rounded-2xl bg-surface border border-border rounded-bl-md">
                <p className="text-sm text-text-muted mb-2">Understanding your request...</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm text-accent">Analyzing intent</span>
                </div>
              </div>
            </div>
          )}

          {/* Data Source Choice */}
          {intent && showDataChoice && (
            <div className="pt-4">
              {/* Show parsed intent summary first */}
              <div className="mb-6 p-5 rounded-xl bg-success-muted/50 border border-success/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary mb-1">Understood!</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{intent.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="badge badge-primary">{intent.taskType}</span>
                      <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>{intent.domain}</span>
                    </div>
                  </div>
                </div>
              </div>

              <DataSourceChoice onChoose={handleDataSourceChoice} />
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Voice Controls */}
      {!showDataChoice && (
        <div className="px-8 py-10 bg-background border-t border-border">
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            <VoiceButton
              voiceState={voice.voiceState}
              onClick={handleVoiceClick}
              disabled={isParsingIntent}
              size="lg"
            />

            <p className="mt-6 text-sm text-text-muted">
              {isParsingIntent
                ? <span className="text-accent animate-pulse">Analyzing your intent...</span>
                : voice.voiceState === 'listening'
                  ? 'Listening... Click to stop'
                  : 'Click to start speaking'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
