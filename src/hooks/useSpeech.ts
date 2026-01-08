import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Simplified speech hook - just handles browser speech recognition.
 * Voice mode will use OpenAI Realtime API instead of ElevenLabs TTS.
 */

interface UseSpeechReturn {
  isRecording: boolean;
  startRecording: (onResult: (transcript: string) => void, onError?: () => void) => void;
  stopRecording: () => void;
}

export function useSpeech(): UseSpeechReturn {
  const [isRecording, setIsRecording] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef<((transcript: string) => void) | null>(null);
  const onErrorRef = useRef<(() => void) | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-GB';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim() && onResultRef.current) {
          onResultRef.current(transcript);
        }
        setIsRecording(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        if (onErrorRef.current) {
          onErrorRef.current();
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const startRecording = useCallback((onResult: (transcript: string) => void, onError?: () => void) => {
    onResultRef.current = onResult;
    onErrorRef.current = onError || null;
    
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
