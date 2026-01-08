import { useState, useRef, useCallback, useEffect } from 'react';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;

interface UseSpeechOptions {
  defaultEnabled?: boolean;
}

interface UseSpeechReturn {
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  isSpeaking: boolean;
  speakingMessageId: string | null;
  isRecording: boolean;
  justFinishedSpeaking: boolean;
  speakText: (text: string, messageId?: string) => Promise<void>;
  stopSpeaking: () => void;
  startRecording: (onResult: (transcript: string) => void, onError?: () => void) => void;
  stopRecording: () => void;
}

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  // Voice OFF by default - user research shows students prefer typing
  const { defaultEnabled = false } = options;
  
  const [voiceEnabled, setVoiceEnabled] = useState(defaultEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [justFinishedSpeaking, setJustFinishedSpeaking] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speakText = useCallback(async (text: string, messageId?: string) => {
    if (!voiceEnabled || !text || !text.trim()) {
      setSpeakingMessageId(null);
      return;
    }
    
    try {
      setIsSpeaking(true);
      if (messageId) setSpeakingMessageId(messageId);
      
      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        return;
      }

      const { audioContent } = await response.json();
      
      if (audioRef.current) audioRef.current.pause();
      
      const audio = new Audio(`data:audio/mpeg;base64,${audioContent}`);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        // Trigger subtle "your turn" pulse
        setJustFinishedSpeaking(true);
        setTimeout(() => setJustFinishedSpeaking(false), 3000);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };
      await audio.play();
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, []);

  const startRecording = useCallback((onResult: (transcript: string) => void, onError?: () => void) => {
    onResultRef.current = onResult;
    onErrorRef.current = onError || null;
    
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      stopSpeaking();
      recognitionRef.current.start();
    }
  }, [isRecording, stopSpeaking]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    voiceEnabled,
    setVoiceEnabled,
    isSpeaking,
    speakingMessageId,
    isRecording,
    justFinishedSpeaking,
    speakText,
    stopSpeaking,
    startRecording,
    stopRecording,
  };
}
