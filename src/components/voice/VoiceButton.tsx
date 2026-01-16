import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import type { VoiceButtonProps } from '../../types';

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

const iconSizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
};

const stateStyles = {
  idle: {
    bg: 'bg-[var(--color-voice-idle)]',
    hoverBg: 'hover:bg-[var(--color-accent-hover)]',
    ring: 'ring-[var(--color-voice-idle)]',
  },
  listening: {
    bg: 'bg-[var(--color-voice-listening)]',
    hoverBg: 'hover:bg-green-600',
    ring: 'ring-[var(--color-voice-listening)]',
  },
  processing: {
    bg: 'bg-[var(--color-voice-processing)]',
    hoverBg: '',
    ring: 'ring-[var(--color-voice-processing)]',
  },
  speaking: {
    bg: 'bg-[var(--color-voice-speaking)]',
    hoverBg: '',
    ring: 'ring-[var(--color-voice-speaking)]',
  },
};

function getIcon(state: VoiceButtonProps['voiceState'], iconSize: string) {
  switch (state) {
    case 'idle':
      return <Mic className={iconSize} />;
    case 'listening':
      return <MicOff className={iconSize} />;
    case 'processing':
      return <Loader2 className={`${iconSize} animate-spin`} />;
    case 'speaking':
      return <Volume2 className={iconSize} />;
  }
}

export function VoiceButton({
  voiceState,
  onClick,
  disabled = false,
  size = 'lg',
}: VoiceButtonProps) {
  const styles = stateStyles[voiceState];
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizeClasses[size];
  const isInteractive = voiceState === 'idle' || voiceState === 'listening';

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Pulse rings for listening state */}
      {voiceState === 'listening' && (
        <>
          <span
            className={`absolute ${sizeClass} rounded-full ${styles.bg} opacity-40 voice-pulse`}
            style={{ animationDelay: '0s' }}
          />
          <span
            className={`absolute ${sizeClass} rounded-full ${styles.bg} opacity-30 voice-pulse`}
            style={{ animationDelay: '0.5s' }}
          />
          <span
            className={`absolute ${sizeClass} rounded-full ${styles.bg} opacity-20 voice-pulse`}
            style={{ animationDelay: '1s' }}
          />
        </>
      )}

      {/* Main button */}
      <button
        onClick={onClick}
        disabled={disabled || !isInteractive}
        className={`
          relative z-10
          ${sizeClass}
          ${styles.bg}
          ${isInteractive && !disabled ? styles.hoverBg : ''}
          rounded-full
          flex items-center justify-center
          text-white
          transition-all duration-200 ease-out
          ${isInteractive && !disabled ? 'cursor-pointer active:scale-95' : 'cursor-default'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-50 ${styles.ring}
          shadow-lg
          ${voiceState === 'listening' ? 'shadow-[var(--color-voice-listening)]/30' : ''}
          ${voiceState === 'speaking' ? 'shadow-[var(--color-voice-speaking)]/30' : ''}
        `}
        aria-label={
          voiceState === 'idle'
            ? 'Start recording'
            : voiceState === 'listening'
            ? 'Stop recording'
            : voiceState === 'processing'
            ? 'Processing...'
            : 'Speaking...'
        }
      >
        {getIcon(voiceState, iconSize)}
      </button>
    </div>
  );
}
