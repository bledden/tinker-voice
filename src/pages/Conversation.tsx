import { useRef, useEffect, useState } from 'react';
import { Sparkles, Upload } from 'lucide-react';
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[70%] px-4 py-3 rounded-lg
          ${isUser
            ? 'bg-accent text-white'
            : 'bg-surface border border-border text-text-primary'
          }
        `}
      >
        <p className="text-sm">{entry.text}</p>
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
      <div className="bg-surface-subtle border border-border rounded-lg px-4 py-3">
        <p className="text-sm text-text-primary">
          Would you like me to generate synthetic training data, or do you have a dataset to upload?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onChoose('generate')}
          className="card card-interactive p-4 text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="font-medium text-text-primary text-sm">Generate Data</span>
          </div>
          <p className="text-xs text-text-secondary">
            Create synthetic training examples with AI
          </p>
        </button>

        <button
          onClick={() => onChoose('upload')}
          className="card card-interactive p-4 text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <Upload className="w-4 h-4 text-accent" />
            <span className="font-medium text-text-primary text-sm">Upload Dataset</span>
          </div>
          <p className="text-xs text-text-secondary">
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Voice Session</h1>
          {intent && <p className="text-sm text-text-muted mt-1">{intent.taskType} • {intent.domain}</p>}
        </div>
        {intent && showDataChoice && (
          <span className="badge badge-success">Intent detected</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          {/* Empty state */}
          {voice.transcript.length === 0 && !voice.currentTranscript && (
            <div className="text-center py-12">
              <p className="text-text-secondary mb-2">Describe what you want to train</p>
              <p className="text-sm text-text-muted">
                Example: "I want to classify customer emails into billing, support, and sales"
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-4">
            {voice.transcript.map((entry) => (
              <TranscriptMessage key={entry.id} entry={entry} />
            ))}

            {voice.currentTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[70%] px-4 py-3 rounded-lg bg-accent/80 text-white">
                  <p className="text-sm">{voice.currentTranscript}</p>
                  <p className="text-xs opacity-70 mt-1">Listening...</p>
                </div>
              </div>
            )}

            {isParsingIntent && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-lg bg-surface border border-border">
                  <p className="text-sm text-text-muted">Analyzing...</p>
                </div>
              </div>
            )}

            {intent && showDataChoice && (
              <div className="pt-4">
                <div className="bg-success-muted border border-success/20 rounded-lg px-4 py-3 mb-4">
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
      </div>

      {/* Voice control */}
      {!showDataChoice && (
        <div className="border-t border-border bg-surface px-8 py-8">
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            <VoiceButton
              voiceState={voice.voiceState}
              onClick={handleVoiceClick}
              disabled={isParsingIntent}
              size="lg"
            />
            <p className="mt-4 text-sm text-text-muted">
              {voice.voiceState === 'listening' ? 'Listening... tap to stop' : 'Tap to speak'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
