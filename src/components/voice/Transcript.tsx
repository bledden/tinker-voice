import { useEffect, useRef } from 'react';
import { User, Bot } from 'lucide-react';
import type { TranscriptProps, TranscriptEntry } from '../../types';
import { InlineWaveform } from './Waveform';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TranscriptMessage({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.role === 'user';

  return (
    <div
      className={`
        flex gap-3 p-3 rounded-lg animate-fade-in
        ${isUser ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-elevated)]'}
      `}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-voice-speaking)]'}
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {isUser ? 'You' : 'TinkerVoice'}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {formatTime(entry.timestamp)}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed break-words">
          {entry.text}
        </p>
      </div>
    </div>
  );
}

function ListeningIndicator({ currentTranscript }: { currentTranscript?: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-voice-listening)]/30 animate-fade-in">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-voice-listening)]">
        <User className="w-4 h-4 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">You</span>
          <span className="text-xs text-[var(--color-voice-listening)] flex items-center gap-1">
            <InlineWaveform isActive={true} />
            Listening...
          </span>
        </div>
        {currentTranscript ? (
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {currentTranscript}
            <span className="inline-block w-1 h-4 ml-1 bg-[var(--color-voice-listening)] animate-pulse" />
          </p>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] italic">
            Start speaking...
          </p>
        )}
      </div>
    </div>
  );
}

export function Transcript({
  entries,
  currentTranscript,
  isListening = false,
}: TranscriptProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, currentTranscript, isListening]);

  const hasContent = entries.length > 0 || isListening;

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3"
    >
      {!hasContent && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
            Ready to listen
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
            Tap the microphone button to start a conversation with TinkerVoice.
          </p>
        </div>
      )}

      {entries.map((entry) => (
        <TranscriptMessage key={entry.id} entry={entry} />
      ))}

      {isListening && <ListeningIndicator currentTranscript={currentTranscript} />}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
