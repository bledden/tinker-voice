import { useEffect, useState, useRef, useMemo } from 'react';
import type { WaveformProps } from '../../types';

export function Waveform({
  isActive,
  audioData,
  color = 'var(--color-accent)',
  barCount = 32,
}: WaveformProps) {
  const [bars, setBars] = useState<number[]>(() => Array(barCount).fill(0.1));
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Generate deterministic animation delays for each bar
  const barDelays = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      // Create a wave-like pattern from center
      const center = barCount / 2;
      const distanceFromCenter = Math.abs(i - center);
      return (distanceFromCenter / center) * 0.3;
    });
  }, [barCount]);

  useEffect(() => {
    if (!isActive) {
      // Reset bars to minimal height when inactive
      setBars(Array(barCount).fill(0.1));
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // If external audio data is provided, use it
    if (audioData && audioData.length > 0) {
      // Normalize and map external data to bar count
      const normalizedBars = Array.from({ length: barCount }, (_, i) => {
        const dataIndex = Math.floor((i / barCount) * audioData.length);
        return Math.max(0.1, Math.min(1, audioData[dataIndex] / 255));
      });
      setBars(normalizedBars);
      return;
    }

    // Otherwise, generate animated mock visualization
    let phase = 0;
    const animate = () => {
      phase += 0.1;

      const newBars = Array.from({ length: barCount }, (_, i) => {
        // Create a dynamic wave pattern
        const center = barCount / 2;
        const normalizedPos = (i - center) / center;

        // Multiple sine waves for organic movement
        const wave1 = Math.sin(phase + normalizedPos * 2) * 0.3;
        const wave2 = Math.sin(phase * 1.5 + normalizedPos * 3) * 0.2;
        const wave3 = Math.sin(phase * 0.7 + normalizedPos) * 0.15;

        // Random noise for natural feel
        const noise = (Math.random() - 0.5) * 0.1;

        // Combine and normalize to 0.1-1.0 range
        const value = 0.4 + wave1 + wave2 + wave3 + noise;
        return Math.max(0.1, Math.min(1, value));
      });

      setBars(newBars);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioData, barCount]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center gap-[2px] h-12 px-4">
      {bars.map((height, index) => (
        <div
          key={index}
          className="rounded-full transition-all duration-75 ease-out"
          style={{
            width: '3px',
            height: `${height * 100}%`,
            minHeight: '4px',
            backgroundColor: isActive ? color : 'var(--color-text-muted)',
            opacity: isActive ? 0.9 : 0.3,
            transitionDelay: isActive ? `${barDelays[index]}s` : '0s',
          }}
        />
      ))}
    </div>
  );
}

// Simpler waveform for inline use
export function InlineWaveform({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`
            w-[2px] rounded-full bg-current
            ${isActive ? 'waveform-bar' : 'h-1'}
          `}
          style={{
            height: isActive ? undefined : '4px',
            animationDelay: isActive ? `${i * 0.1}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
