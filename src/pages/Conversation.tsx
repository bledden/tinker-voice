import { useRef, useEffect } from 'react';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { VoiceButton } from '@/components/voice/VoiceButton';
import { UseVoiceReturn, TranscriptEntry, TrainingIntent } from '@/types';

export interface ConversationProps {
  voice: UseVoiceReturn;
  intent: TrainingIntent | null;
  onProceed: () => void;
  isParsingIntent?: boolean;
}

function TranscriptMessage({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] px-4 py-3 rounded-2xl
          ${isUser
            ? 'bg-accent text-white rounded-br-md'
            : 'bg-surface border border-border text-text-primary rounded-bl-md'
          }
        `}
      >
        <p className="text-sm">{entry.text}</p>
        <p className={`text-xs mt-1 ${isUser ? 'opacity-70' : 'text-text-muted'}`}>
          {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export function Conversation({ voice, intent, onProceed, isParsingIntent }: ConversationProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [voice.transcript.length, voice.currentTranscript]);

  const handleVoiceClick = () => {
    if (voice.voiceState === 'idle') {
      voice.startListening();
    } else if (voice.voiceState === 'listening') {
      voice.stopListening();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-semibold text-text-primary">Describe Your Training</h1>
        </div>
        {intent && (
          <button
            onClick={onProceed}
            disabled={isParsingIntent}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Review Data
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {voice.transcript.length === 0 && !voice.currentTranscript && (
            <div className="text-center py-12">
              <p className="text-text-secondary mb-2">Start speaking to describe what you want to train</p>
              <p className="text-sm text-text-muted">
                For example: "I want to train a model to classify customer feedback as positive or negative"
              </p>
            </div>
          )}

          {voice.transcript.map((entry) => (
            <TranscriptMessage key={entry.id} entry={entry} />
          ))}

          {/* Live transcription */}
          {voice.currentTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-accent/50 text-white rounded-br-md border border-accent/30">
                <p className="text-sm">{voice.currentTranscript}</p>
                <p className="text-xs mt-1 opacity-70">Listening...</p>
              </div>
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Intent Preview */}
      {intent && (
        <div className="px-8 py-4 bg-surface border-t border-border">
          <div className="max-w-2xl mx-auto">
            <p className="text-sm text-text-muted mb-2">Detected Intent:</p>
            <div className="bg-background rounded-lg px-4 py-3 border border-border">
              <p className="text-text-primary font-medium">{intent.description}</p>
              <div className="flex gap-4 mt-2 text-sm text-text-secondary">
                <span>Type: {intent.taskType}</span>
                <span>Domain: {intent.domain}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Controls */}
      <div className="px-8 py-8 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <VoiceButton
            voiceState={voice.voiceState}
            onClick={handleVoiceClick}
            disabled={isParsingIntent}
            size="lg"
          />

          {isParsingIntent && (
            <p className="mt-12 text-sm text-accent animate-pulse">
              Analyzing your intent...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
