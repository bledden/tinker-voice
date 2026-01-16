import { useState, useCallback, useRef } from 'react';
import { transcribeAudio, speakText } from '@/lib/api';
import type { VoiceState, TranscriptEntry, UseVoiceReturn } from '../types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function useVoice(): UseVoiceReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');

  // Refs for managing audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking';
  const isProcessing = voiceState === 'processing';

  const startListening = useCallback(async () => {
    if (voiceState !== 'idle') return;

    try {
      setVoiceState('listening');
      setCurrentTranscript('');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context for analysis (waveform visualization)
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error('Failed to start recording:', error);
      setVoiceState('idle');
    }
  }, [voiceState]);

  const stopListening = useCallback(async () => {
    if (voiceState !== 'listening') return;

    try {
      setVoiceState('processing');

      // Stop the media recorder and collect audio data
      let audioBlob: Blob | null = null;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        // Wait for final data
        await new Promise<void>((resolve) => {
          mediaRecorderRef.current!.onstop = () => resolve();
          mediaRecorderRef.current!.stop();
        });
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      }

      // Close audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Convert audio blob to base64 for API
      let audioBase64 = '';
      if (audioBlob) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        audioBase64 = btoa(String.fromCharCode(...uint8Array));
      }

      // Send audio to ElevenLabs for transcription
      const result = await transcribeAudio(audioBase64);

      if (result.transcript) {
        setCurrentTranscript('');

        // Add user's speech to transcript
        const userEntry: TranscriptEntry = {
          id: generateId(),
          role: 'user',
          text: result.transcript,
          timestamp: new Date(),
        };
        setTranscript(prev => [...prev, userEntry]);
      }

      setVoiceState('idle');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setVoiceState('idle');
    }
  }, [voiceState]);

  const speak = useCallback(async (text: string) => {
    if (voiceState !== 'idle') return;

    try {
      setVoiceState('speaking');

      // Add AI response to transcript
      const aiEntry: TranscriptEntry = {
        id: generateId(),
        role: 'assistant',
        text,
        timestamp: new Date(),
      };
      setTranscript(prev => [...prev, aiEntry]);

      // Call ElevenLabs TTS
      await speakText(text);

      setVoiceState('idle');
    } catch (error) {
      console.error('Failed to speak:', error);
      setVoiceState('idle');
    }
  }, [voiceState]);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setCurrentTranscript('');
  }, []);

  return {
    isListening,
    isSpeaking,
    isProcessing,
    voiceState,
    transcript,
    currentTranscript,
    startListening,
    stopListening,
    speak,
    clearTranscript,
  };
}

// Export the analyser ref getter for waveform visualization
export function getAudioAnalyser(): AnalyserNode | null {
  return null;
}
