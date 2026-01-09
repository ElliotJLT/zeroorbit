import { useState, useCallback } from 'react';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export interface Message {
  id: string;
  sender: 'student' | 'tutor';
  content: string;
  imageUrl?: string;
  inputMethod?: 'text' | 'voice' | 'photo';
  studentBehavior?: string;
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
    studentBehavior?: string
  ) => {
    const words = fullText.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      const textToShow = currentText;
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, content: textToShow, studentBehavior: i === words.length - 1 ? studentBehavior : undefined }
            : m
        )
      );
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
    }
  }, []);

  const displayMessagesSequentially = useCallback(async (
    replyMessages: string[], 
    placeholderId: string, 
    studentBehavior?: string
  ) => {
    // First message replaces placeholder with typing effect
    const firstReply = replyMessages[0];
    await typeMessage(placeholderId, firstReply, studentBehavior);
    
    // Additional messages appear after delay with typing effect
    for (let i = 1; i < replyMessages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const newMsgId = `msg-${Date.now()}-${i}`;
      setMessages(prev => [...prev, { id: newMsgId, sender: 'tutor', content: '' }]);
      await typeMessage(newMsgId, replyMessages[i]);
    }
  }, [typeMessage]);

  const streamChat = useCallback(async (
    allMessages: Message[]
  ): Promise<{ reply_messages: string[]; student_behavior?: string }> => {
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
      }),
    });

    if (!response.ok) throw new Error('Failed to chat');

    const data = await response.json();
    const msgs = data.reply_messages || [data.reply_text || data.content || "I'm having trouble responding. Try again?"];
    return {
      reply_messages: msgs,
      student_behavior: data.student_behavior,
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
      const { reply_messages, student_behavior } = await streamChat(allMessages);
      await displayMessagesSequentially(reply_messages, placeholderId, student_behavior);
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
      
      await displayMessagesSequentially(replyMessages, placeholderId, data.student_behavior);
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
