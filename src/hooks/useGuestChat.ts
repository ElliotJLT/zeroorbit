import { useState, useCallback } from 'react';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export interface Message {
  id: string;
  sender: 'student' | 'tutor';
  content: string;
  imageUrl?: string;
  inputMethod?: 'text' | 'voice' | 'photo';
  studentBehavior?: string;
  nextAction?: string;
  stuckCount?: number;
  offerVoiceResponse?: boolean;
  errorAnalysis?: {
    type: 'mechanical' | 'conceptual' | 'none';
    severity?: 'minor' | 'major';
    location?: string;
    fix_hint?: string;
    needs_reteach?: boolean;
  };
  marksAnalysis?: {
    estimated_marks?: string;
    method_marks?: string;
    accuracy_marks?: string;
    errors?: Array<{ line: string; type: string; description: string }>;
  };
  alternativeMethod?: {
    method_name: string;
    brief_explanation: string;
  };
}

export interface QuestionAnalysis {
  questionSummary: string;
  topic: string;
  difficulty: string;
  socraticOpening: string;
  methodCue?: string | null;
}

interface UserContext {
  currentGrade: string;
  targetGrade: string;
  examBoard: string;
  struggles: string;
  questionText: string;
  tutorMode?: 'coach' | 'check';
}

interface UseGuestChatOptions {
  userContext: UserContext;
  onFirstInput?: (method: 'text' | 'voice' | 'photo') => void;
}

export function useGuestChat({ userContext, onFirstInput }: UseGuestChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ url: string; mode: 'working' | 'question' } | null>(null);
  const [firstInputTracked, setFirstInputTracked] = useState(false);

  const trackFirstInput = useCallback((method: 'text' | 'voice' | 'photo') => {
    if (!firstInputTracked && onFirstInput) {
      setFirstInputTracked(true);
      onFirstInput(method);
    }
  }, [firstInputTracked, onFirstInput]);

  const typeMessage = useCallback(async (
    messageId: string, 
    fullText: string, 
    metadata?: {
      studentBehavior?: string;
      nextAction?: string;
      stuckCount?: number;
      offerVoiceResponse?: boolean;
      errorAnalysis?: Message['errorAnalysis'];
      marksAnalysis?: Message['marksAnalysis'];
      alternativeMethod?: Message['alternativeMethod'];
    }
  ) => {
    const words = fullText.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      const textToShow = currentText;
      const isLastWord = i === words.length - 1;
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { 
                ...m, 
                content: textToShow,
                ...(isLastWord ? {
                  studentBehavior: metadata?.studentBehavior,
                  nextAction: metadata?.nextAction,
                  stuckCount: metadata?.stuckCount,
                  offerVoiceResponse: metadata?.offerVoiceResponse,
                  errorAnalysis: metadata?.errorAnalysis,
                  marksAnalysis: metadata?.marksAnalysis,
                  alternativeMethod: metadata?.alternativeMethod,
                } : {})
              }
            : m
        )
      );
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
    }
  }, []);

  const displayMessagesSequentially = useCallback(async (
    replyMessages: string[], 
    placeholderId: string, 
    metadata?: {
      studentBehavior?: string;
      nextAction?: string;
      stuckCount?: number;
      offerVoiceResponse?: boolean;
      errorAnalysis?: Message['errorAnalysis'];
      marksAnalysis?: Message['marksAnalysis'];
      alternativeMethod?: Message['alternativeMethod'];
    }
  ) => {
    // First message replaces placeholder with typing effect
    const firstReply = replyMessages[0];
    // Pass metadata only to the last message in the sequence
    const isOnlyMessage = replyMessages.length === 1;
    await typeMessage(placeholderId, firstReply, isOnlyMessage ? metadata : undefined);
    
    // Additional messages appear after delay with typing effect
    for (let i = 1; i < replyMessages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const newMsgId = `msg-${Date.now()}-${i}`;
      setMessages(prev => [...prev, { id: newMsgId, sender: 'tutor', content: '' }]);
      const isLast = i === replyMessages.length - 1;
      await typeMessage(newMsgId, replyMessages[i], isLast ? metadata : undefined);
    }
  }, [typeMessage]);

  const streamChat = useCallback(async (
    allMessages: Message[],
    inputMethod?: 'text' | 'voice' | 'photo'
  ): Promise<{ 
    reply_messages: string[]; 
    student_behavior?: string;
    next_action?: string;
    stuck_count?: number;
    offer_voice_response?: boolean;
    error_analysis?: Message['errorAnalysis'];
    marks_analysis?: Message['marksAnalysis'];
    alternative_method?: Message['alternativeMethod'];
  }> => {
    const { currentGrade, targetGrade, examBoard, struggles, questionText, tutorMode } = userContext;
    
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: allMessages.map((m) => ({
          role: m.sender,
          content: m.content,
          image_url: m.imageUrl,
        })),
        questionContext: `${examBoard || 'Unknown board'} A-Level student, current grade: ${currentGrade || 'Unknown'}, target: ${targetGrade || 'Unknown'}. Struggles with: ${struggles || 'Not specified'}. Question: ${questionText || 'See attached image'}`,
        userContext: {
          level: 'A-Level',
          board: examBoard || 'Unknown',
          targetGrade: targetGrade || 'Unknown',
        },
        tutor_mode: tutorMode || 'coach',
        input_method: inputMethod,
      }),
    });

    if (!response.ok) throw new Error('Failed to chat');

    const data = await response.json();
    const msgs = data.reply_messages || [data.reply_text || data.content || "I'm having trouble responding. Try again?"];
    return {
      reply_messages: msgs,
      student_behavior: data.student_behavior,
      next_action: data.next_action,
      stuck_count: data.stuck_count,
      offer_voice_response: data.offer_voice_response,
      error_analysis: data.error_analysis,
      marks_analysis: data.marks_analysis,
      alternative_method: data.alternative_method,
    };
  }, [userContext]);

  const sendMessage = useCallback(async (
    content: string, 
    inputMethod: 'text' | 'voice' | 'photo' = 'text'
  ) => {
    if (!content.trim() || sending) return;

    trackFirstInput(inputMethod);
    setSending(true);

    const studentMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'student',
      content: content.trim(),
      inputMethod,
    };

    const placeholderId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      studentMessage,
      { id: placeholderId, sender: 'tutor', content: '' },
    ]);

    try {
      const allMessages = [...messages, studentMessage];
      const { reply_messages, student_behavior, next_action, stuck_count, offer_voice_response, error_analysis, marks_analysis, alternative_method } = await streamChat(allMessages, inputMethod);
      await displayMessagesSequentially(reply_messages, placeholderId, {
        studentBehavior: student_behavior,
        nextAction: next_action,
        stuckCount: stuck_count,
        offerVoiceResponse: offer_voice_response,
        errorAnalysis: error_analysis,
        marksAnalysis: marks_analysis,
        alternativeMethod: alternative_method,
      });
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
    } finally {
      setSending(false);
    }
  }, [sending, messages, streamChat, displayMessagesSequentially, trackFirstInput]);

  const handleImageUpload = useCallback((imageUrl: string, mode: 'working' | 'question') => {
    trackFirstInput('photo');
    setPendingImage({ url: imageUrl, mode });
  }, [trackFirstInput]);

  const confirmImageUpload = useCallback(async (intent: string) => {
    if (!pendingImage) return;
    
    const imageMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'student',
      content: intent,
      imageUrl: pendingImage.url,
      inputMethod: 'photo',
    };
    
    const imageMode = pendingImage.mode;
    setPendingImage(null);
    
    setSending(true);
    
    const placeholderId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      imageMessage,
      { id: placeholderId, sender: 'tutor', content: '' },
    ]);
    
    try {
      const { currentGrade, targetGrade, examBoard, struggles, questionText, tutorMode } = userContext;
      const allMessages = [...messages, imageMessage];
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({
            role: m.sender,
            content: m.content,
            image_url: m.imageUrl,
          })),
          questionContext: `${examBoard || 'Unknown board'} A-Level student, current grade: ${currentGrade || 'Unknown'}, target: ${targetGrade || 'Unknown'}. Struggles with: ${struggles || 'Not specified'}. Question: ${questionText || 'See attached image'}`,
          userContext: {
            level: 'A-Level',
            board: examBoard || 'Unknown',
            targetGrade: targetGrade || 'Unknown',
          },
          image_type: imageMode,
          tutor_mode: tutorMode || 'coach',
        }),
      });

      if (!response.ok) throw new Error('Failed to chat');

      const data = await response.json();
      const replyMessages = data.reply_messages || [data.reply_text || data.content || "I'm having trouble responding. Try again?"];
      
      await displayMessagesSequentially(replyMessages, placeholderId, {
        studentBehavior: data.student_behavior,
        nextAction: data.next_action,
        stuckCount: data.stuck_count,
        errorAnalysis: data.error_analysis,
        marksAnalysis: data.marks_analysis,
        alternativeMethod: data.alternative_method,
      });
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { ...m, content: "Sorry, I'm having trouble. Try again?" }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }, [pendingImage, messages, userContext, displayMessagesSequentially]);

  const initializeWithOpening = useCallback((opening: string) => {
    const messageId = `msg-${Date.now()}`;
    setMessages([{ id: messageId, sender: 'tutor', content: opening }]);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setPendingImage(null);
    setFirstInputTracked(false);
  }, []);

  return {
    messages,
    setMessages,
    sending,
    pendingImage,
    setPendingImage,
    sendMessage,
    handleImageUpload,
    confirmImageUpload,
    initializeWithOpening,
    resetChat,
  };
}
