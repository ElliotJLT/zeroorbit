import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const GUEST_LIMIT = 10;
const EXCHANGE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface Message {
  id: string;
  content: string;
  sender: 'student' | 'tutor';
  imageUrl?: string;
  isTyping?: boolean;
  showMarksAnalysis?: boolean;
  errorType?: string;
  errorLocation?: string;
  showSeeAnotherApproach?: boolean;
  showStillStuck?: boolean;
  isCorrect?: boolean;
}

export interface UserContext {
  examBoard?: string;
  yearGroup?: string;
  targetGrade?: string;
  tier?: string;
}

export interface QuestionAnalysis {
  topic?: string;
  difficulty?: string;
  subtopic?: string;
}

interface UseChatOptions {
  user: User | null;
  userContext: UserContext;
  onFirstInput?: (method: 'text' | 'voice' | 'photo') => void;
}

interface GuestExchangeData {
  count: number;
  timestamp: number;
}

function getGuestExchangeCount(): number {
  try {
    const stored = localStorage.getItem('orbitGuestExchanges');
    if (!stored) return 0;
    
    const { count, timestamp } = JSON.parse(stored) as GuestExchangeData;
    // Reset after 24 hours
    if (Date.now() - timestamp > EXCHANGE_EXPIRY_MS) {
      localStorage.removeItem('orbitGuestExchanges');
      return 0;
    }
    return count;
  } catch {
    return 0;
  }
}

function incrementGuestExchanges(): number {
  const current = getGuestExchangeCount();
  const newCount = current + 1;
  localStorage.setItem('orbitGuestExchanges', JSON.stringify({
    count: newCount,
    timestamp: Date.now()
  }));
  return newCount;
}

export function useChat({ user, userContext, onFirstInput }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ url: string; mode: 'coach' | 'check' } | null>(null);
  const [guestExchangeCount, setGuestExchangeCount] = useState(getGuestExchangeCount);
  const [questionAnalysis, setQuestionAnalysis] = useState<QuestionAnalysis | null>(null);
  
  const hasTrackedFirstInput = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const isAtLimit = !user && guestExchangeCount >= GUEST_LIMIT;

  const trackFirstInput = useCallback((method: 'text' | 'voice' | 'photo') => {
    if (!hasTrackedFirstInput.current) {
      hasTrackedFirstInput.current = true;
      onFirstInput?.(method);
    }
  }, [onFirstInput]);

  const typeMessage = useCallback(async (
    messageId: string,
    fullContent: string,
    onComplete?: () => void
  ) => {
    const words = fullContent.split(' ');
    let currentContent = '';

    for (let i = 0; i < words.length; i++) {
      currentContent += (i === 0 ? '' : ' ') + words[i];
      const content = currentContent;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content, isTyping: i < words.length - 1 }
            : msg
        )
      );

      if (i < words.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    onComplete?.();
  }, []);

  const displayMessagesSequentially = useCallback(async (
    tutorMessages: Array<{
      content: string;
      showMarksAnalysis?: boolean;
      errorType?: string;
      errorLocation?: string;
      showSeeAnotherApproach?: boolean;
      showStillStuck?: boolean;
      isCorrect?: boolean;
    }>
  ) => {
    for (let i = 0; i < tutorMessages.length; i++) {
      const msg = tutorMessages[i];
      const messageId = `tutor-${Date.now()}-${i}`;

      setMessages(prev => [
        ...prev,
        {
          id: messageId,
          content: '',
          sender: 'tutor',
          isTyping: true,
          ...msg,
        },
      ]);

      await new Promise<void>(resolve => {
        typeMessage(messageId, msg.content, resolve);
      });

      if (i < tutorMessages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
  }, [typeMessage]);

  const streamChat = useCallback(async (
    studentMessage: string,
    imageUrl?: string,
    mode?: 'coach' | 'check'
  ) => {
    // Build conversation history in the format the edge function expects
    const conversationHistory = messages.map(m => ({
      role: m.sender, // 'student' or 'tutor'
      content: m.content,
      ...(m.imageUrl && { image_url: m.imageUrl }),
    }));

    // Add the new student message
    conversationHistory.push({
      role: 'student',
      content: studentMessage || (mode === 'check' ? 'Check my working' : 'Help me with this question'),
      ...(imageUrl && { image_url: imageUrl }),
    });

    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        messages: conversationHistory,
        userContext: {
          level: userContext.yearGroup ? (parseInt(userContext.yearGroup) >= 12 ? 'A-Level' : 'GCSE') : 'A-Level',
          board: userContext.examBoard || 'Unknown',
          tier: userContext.tier,
          targetGrade: userContext.targetGrade,
        },
        image_type: imageUrl ? 'working' : undefined,
        latest_image_url: imageUrl,
        tutor_mode: mode,
        questionContext: questionAnalysis ? `Topic: ${questionAnalysis.topic}, Difficulty: ${questionAnalysis.difficulty}` : undefined,
      },
    });

    if (error) throw error;

    // The edge function returns structured response with reply_messages array
    const replyMessages = data.reply_messages || [data.reply || "I'm having trouble responding."];
    
    return {
      reply: replyMessages.join('\n\n'),
      showMarksAnalysis: !!data.marks_analysis,
      errorType: data.error_analysis?.type,
      errorLocation: data.error_analysis?.location,
      showSeeAnotherApproach: data.next_action === 'offer_alternative',
      showStillStuck: data.student_behavior === 'expressed_confusion',
      isCorrect: data.student_behavior === 'correct_answer',
      analysis: data.topic ? { topic: data.topic, difficulty: data.difficulty } : undefined,
    };
  }, [messages, userContext, questionAnalysis]);

  const sendMessage = useCallback(async (content: string, inputMethod?: 'text' | 'voice') => {
    if (!content.trim() || sending || isAtLimit) return;

    trackFirstInput(inputMethod || 'text');

    const studentMessage: Message = {
      id: `student-${Date.now()}`,
      content: content.trim(),
      sender: 'student',
    };

    setMessages(prev => [...prev, studentMessage]);
    setSending(true);

    // Increment guest exchange count
    if (!user) {
      const newCount = incrementGuestExchanges();
      setGuestExchangeCount(newCount);
    }

    try {
      const response = await streamChat(content.trim());

      if (response.analysis) {
        setQuestionAnalysis(response.analysis);
      }

      await displayMessagesSequentially([{
        content: response.reply,
        showMarksAnalysis: response.showMarksAnalysis,
        errorType: response.errorType,
        errorLocation: response.errorLocation,
        showSeeAnotherApproach: response.showSeeAnotherApproach,
        showStillStuck: response.showStillStuck,
        isCorrect: response.isCorrect,
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: "Sorry, I couldn't process that. Please try again.",
          sender: 'tutor',
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [sending, isAtLimit, user, trackFirstInput, streamChat, displayMessagesSequentially]);

  const handleImageUpload = useCallback((imageUrl: string, mode: 'coach' | 'check') => {
    setPendingImage({ url: imageUrl, mode });
  }, []);

  // Send image directly without pending state (for use after review screen)
  const sendImageMessage = useCallback(async (imageUrl: string, mode: 'coach' | 'check', additionalContext?: string) => {
    if (sending || isAtLimit) return;

    trackFirstInput('photo');

    const studentMessage: Message = {
      id: `student-${Date.now()}`,
      content: additionalContext || (mode === 'check' ? 'Check my working' : 'Help me with this question'),
      sender: 'student',
      imageUrl: imageUrl,
    };

    setMessages(prev => [...prev, studentMessage]);
    setSending(true);

    // Increment guest exchange count
    if (!user) {
      const newCount = incrementGuestExchanges();
      setGuestExchangeCount(newCount);
    }

    try {
      const response = await streamChat(
        additionalContext || '',
        imageUrl,
        mode
      );

      if (response.analysis) {
        setQuestionAnalysis(response.analysis);
      }

      await displayMessagesSequentially([{
        content: response.reply,
        showMarksAnalysis: response.showMarksAnalysis,
        errorType: response.errorType,
        errorLocation: response.errorLocation,
        showSeeAnotherApproach: response.showSeeAnotherApproach,
        showStillStuck: response.showStillStuck,
        isCorrect: response.isCorrect,
      }]);
    } catch (error) {
      console.error('Image chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: "Sorry, I couldn't analyze that image. Please try again.",
          sender: 'tutor',
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [sending, isAtLimit, user, trackFirstInput, streamChat, displayMessagesSequentially]);

  const confirmImageUpload = useCallback(async (additionalContext?: string) => {
    if (!pendingImage || sending || isAtLimit) return;

    trackFirstInput('photo');

    const studentMessage: Message = {
      id: `student-${Date.now()}`,
      content: additionalContext || (pendingImage.mode === 'check' ? 'Check my working' : 'Help me with this question'),
      sender: 'student',
      imageUrl: pendingImage.url,
    };

    setMessages(prev => [...prev, studentMessage]);
    setPendingImage(null);
    setSending(true);

    // Increment guest exchange count
    if (!user) {
      const newCount = incrementGuestExchanges();
      setGuestExchangeCount(newCount);
    }

    try {
      const response = await streamChat(
        additionalContext || '',
        pendingImage.url,
        pendingImage.mode
      );

      if (response.analysis) {
        setQuestionAnalysis(response.analysis);
      }

      await displayMessagesSequentially([{
        content: response.reply,
        showMarksAnalysis: response.showMarksAnalysis,
        errorType: response.errorType,
        errorLocation: response.errorLocation,
        showSeeAnotherApproach: response.showSeeAnotherApproach,
        showStillStuck: response.showStillStuck,
        isCorrect: response.isCorrect,
      }]);
    } catch (error) {
      console.error('Image chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: "Sorry, I couldn't analyze that image. Please try again.",
          sender: 'tutor',
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [pendingImage, sending, isAtLimit, user, trackFirstInput, streamChat, displayMessagesSequentially]);

  const cancelPendingImage = useCallback(() => {
    setPendingImage(null);
  }, []);

  const initializeWithOpening = useCallback((openingMessage: string) => {
    setMessages([{
      id: 'opening',
      content: openingMessage,
      sender: 'tutor',
    }]);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setPendingImage(null);
    setQuestionAnalysis(null);
    hasTrackedFirstInput.current = false;
    sessionIdRef.current = null;
  }, []);

  const setAnalysis = useCallback((analysis: QuestionAnalysis) => {
    setQuestionAnalysis(analysis);
  }, []);

  return {
    messages,
    sending,
    pendingImage,
    guestExchangeCount,
    guestLimit: GUEST_LIMIT,
    isAtLimit,
    questionAnalysis,
    sessionId: sessionIdRef.current,
    sendMessage,
    handleImageUpload,
    sendImageMessage,
    confirmImageUpload,
    cancelPendingImage,
    initializeWithOpening,
    resetChat,
    setAnalysis,
  };
}
