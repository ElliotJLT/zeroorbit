import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, X, Mic, MicOff, Send, Upload, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import orbitLogo from '@/assets/orbit-logo.png';
import orbitIcon from '@/assets/orbit-icon.png';
import BetaEntryModal from '@/components/BetaEntryModal';
import PostSessionSurvey from '@/components/PostSessionSurvey';

import HomeScreen from '@/components/HomeScreen';
import BurgerMenu from '@/components/BurgerMenu';
import NewProblemModal from '@/components/NewProblemModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Topic {
  id: string;
  name: string;
  slug: string;
  section: string | null;
}

interface QuestionAnalysis {
  questionSummary: string;
  topic: string;
  difficulty: string;
  socraticOpening: string;
}

interface Message {
  id: string;
  sender: 'student' | 'tutor';
  content: string;
  imageUrl?: string;
  inputMethod?: 'text' | 'voice' | 'photo';
  studentBehavior?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;
const MAX_FREE_EXCHANGES = 4;
const UNLIMITED_TESTING = true;
const BETA_MODE = true; // Enable beta testing features

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'home' | 'setup' | 'upload' | 'preview' | 'chat'>('home');
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string; slug: string } | null>(null);
  
  // Topics for syllabus browser
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [questionText, setQuestionText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<QuestionAnalysis | null>(null);
  
  // Student context
  const [currentGrade, setCurrentGrade] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [examBoard, setExamBoard] = useState('');
  const [struggles, setStruggles] = useState('');
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [justFinishedSpeaking, setJustFinishedSpeaking] = useState(false);
  
  // Beta testing state
  const [betaTesterName, setBetaTesterName] = useState<string | null>(() => 
    BETA_MODE ? localStorage.getItem('betaTesterName') : null
  );
  const [showBetaEntry, setShowBetaEntry] = useState(BETA_MODE && !localStorage.getItem('betaTesterName'));
  const [showSurvey, setShowSurvey] = useState(false);
  const [firstInputMethod, setFirstInputMethod] = useState<'text' | 'voice' | 'photo' | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showNewProblemModal, setShowNewProblemModal] = useState(false);
  const [modalAnalyzing, setModalAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workingFileInputRef = useRef<HTMLInputElement>(null);
  const questionFileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Fetch topics for syllabus browser
  useEffect(() => {
    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('sort_order');
      if (!error && data) {
        setTopics(data as Topic[]);
      }
      setLoadingTopics(false);
    };
    fetchTopics();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        if (transcript.trim()) {
          sendMessage(transcript, 'voice');
        }
        setIsRecording(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        toast({
          variant: 'destructive',
          title: 'Voice not recognized',
          description: 'Please try again or type your message.',
        });
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      stopSpeaking();
      recognitionRef.current.start();
    } else if (!recognitionRef.current) {
      // Fallback to text input if speech recognition not available
      setShowInput(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

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
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }, [voiceEnabled]);

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setStep('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  // State for pending image upload (to show intent chips)
  const [pendingImage, setPendingImage] = useState<{ url: string; mode: 'working' | 'question' } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, mode: 'working' | 'question') => {
    const file = e.target.files?.[0];
    if (file && step === 'chat') {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImageUrl = reader.result as string;
        // Track photo as first input method if not set
        if (BETA_MODE && !firstInputMethod) {
          setFirstInputMethod('photo');
        }
        
        // Show the image with intent chips instead of auto-sending
        setPendingImage({ url: newImageUrl, mode });
      };
      reader.readAsDataURL(file);
    }
    // Reset the input so same file can be selected again
    e.target.value = '';
  };

  const confirmImageUpload = (intent: string) => {
    if (!pendingImage) return;
    
    // Add image as a student message with the selected intent
    const imageMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'student',
      content: intent,
      imageUrl: pendingImage.url,
      inputMethod: 'photo',
    };
    setMessages(prev => [...prev, imageMessage]);
    
    // Clear pending image
    const imageMode = pendingImage.mode;
    setPendingImage(null);
    
    // Get tutor response with image context (pass mode via streamChat)
    fetchTutorResponseWithImage(imageMessage, imageMode);
  };

  const fetchTutorResponseWithImage = async (studentMessage: Message, imageMode: 'working' | 'question') => {
    setSending(true);
    
    const placeholderId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, sender: 'tutor', content: '' },
    ]);
    
    try {
      const allMessages = [...messages, studentMessage];
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
          })),
          questionContext: `A-Level student (${examBoard || 'Unknown board'}), current grade: ${currentGrade || 'Unknown'}, target: ${targetGrade || 'Unknown'}. Struggles with: ${struggles || 'Not specified'}. Question: ${questionText || 'See attached image'}`,
          image_type: imageMode,
          latest_image_url: studentMessage.imageUrl,
        }),
      });

      if (!response.ok) throw new Error('Failed to chat');

      const data = await response.json();
      const replyMessages = data.reply_messages || [data.reply_text || data.content || "I'm having trouble responding. Try again?"];
      
      // Display messages with typing effect
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
  };

  const displayMessagesSequentially = async (
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
    
    // Speak the last message
    if (voiceEnabled && replyMessages.length > 0) {
      const lastMsg = replyMessages[replyMessages.length - 1];
      speakText(lastMsg, `msg-${Date.now()}`);
    }
  };

  const typeMessage = async (messageId: string, fullText: string, studentBehavior?: string) => {
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
      // Variable delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
    }
  };

  // Handle beta entry completion
  const handleBetaEntryComplete = (name: string) => {
    setBetaTesterName(name);
    setShowBetaEntry(false);
  };

  // Handle survey completion
  const handleSurveyComplete = async (data: {
    confidence: number;
    wouldUseAgain: 'yes' | 'no' | 'maybe';
    feedback: string;
  }) => {
    // Log the beta session data
    console.log('Beta session complete:', {
      betaTesterName,
      firstInputMethod,
      messageCount: messages.length,
      studentBehaviors: messages.filter(m => m.studentBehavior).map(m => m.studentBehavior),
      ...data,
    });
    
    setShowSurvey(false);
    toast({
      title: 'Thanks for your feedback! 🙏',
      description: 'Your input helps us improve Orbit.',
    });
    
    // Reset for next session
    setStep('home');
    setMessages([]);
    setFirstInputMethod(null);
  };

  // End session and show survey
  const handleEndSession = () => {
    if (BETA_MODE && messages.length > 2) {
      setShowSurvey(true);
    } else {
      setStep('home');
      setMessages([]);
    }
  };

  const startTextOnlyChat = async () => {
    if (!questionText.trim()) return;
    
    setIsAnalyzing(true);
    setStep('chat');
    
    const messageId = `msg-${Date.now()}`;
    setMessages([{ id: messageId, sender: 'tutor', content: '' }]);
    
    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          questionContext: `A-Level student (${examBoard || 'Unknown board'}), current grade: ${currentGrade || 'Unknown'}, target: ${targetGrade || 'Unknown'}. Struggles with: ${struggles || 'Not specified'}. Question: ${questionText}`,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const replyText = data.reply_text || data.content || "I'm having trouble responding. Try again?";
      
      setMessages([{ id: messageId, sender: 'tutor', content: replyText }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([{ 
        id: messageId, 
        sender: 'tutor', 
        content: "Hey! I can see your question. Let me help you work through it step by step. What have you tried so far?" 
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeAndStartChat = async () => {
    if (!imagePreview) return;
    
    setIsAnalyzing(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await supabase.functions.invoke('analyze-question', {
        body: { 
          imageBase64: imagePreview,
          questionText: questionText 
        },
      });
      
      clearTimeout(timeoutId);

      if (response.error) throw new Error(response.error.message);

      const analysisData = response.data as QuestionAnalysis;
      setAnalysis(analysisData);
      
      // Go directly to text chat
      startTextChatWithAnalysis(analysisData);
      
    } catch (error) {
      console.error('Analysis error:', error);
      // Even on error, go directly to chat
      const fallbackAnalysis = {
        questionSummary: questionText || 'Question from image',
        topic: 'Unknown',
        difficulty: 'Unknown',
        socraticOpening: "Hey! I can see your question. Let me help you work through it step by step. What have you tried so far?",
      };
      setAnalysis(fallbackAnalysis);
      startTextChatWithAnalysis(fallbackAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler for NewProblemModal submission
  const handleNewProblemSubmit = async (newImageUrl: string | null, newQuestionText: string) => {
    setModalAnalyzing(true);
    
    // Reset current session state
    setMessages([]);
    setAnalysis(null);
    setImagePreview(newImageUrl);
    setQuestionText(newQuestionText);
    
    try {
      // Analyze and start new chat
      const response = await supabase.functions.invoke('analyze-question', {
        body: { 
          imageBase64: newImageUrl,
          questionText: newQuestionText 
        },
      });

      let analysisData: QuestionAnalysis;
      
      if (response.error) {
        analysisData = {
          questionSummary: newQuestionText || 'Question from image',
          topic: 'Unknown',
          difficulty: 'Unknown',
          socraticOpening: "I can see your question. Let's work through it step by step. What have you tried so far?",
        };
      } else {
        analysisData = response.data as QuestionAnalysis;
      }
      
      setAnalysis(analysisData);
      
      // Start text chat directly with the new question
      const initialMessage: Message = {
        id: `msg-${Date.now()}`,
        sender: 'tutor',
        content: analysisData.socraticOpening,
      };
      
      setMessages([initialMessage]);
      setShowNewProblemModal(false);
      setStep('chat');
      
      // Reset beta tracking for new session
      setFirstInputMethod(null);
      setSessionId(null);
      
      if (voiceEnabled) speakText(analysisData.socraticOpening, initialMessage.id);
      
    } catch (error) {
      console.error('Analysis error:', error);
      // Fallback - still start chat
      const fallbackAnalysis = {
        questionSummary: newQuestionText || 'Question from image',
        topic: 'Unknown',
        difficulty: 'Unknown',
        socraticOpening: "I can see your question. Let's work through it step by step. What have you tried so far?",
      };
      
      setAnalysis(fallbackAnalysis);
      
      const initialMessage: Message = {
        id: `msg-${Date.now()}`,
        sender: 'tutor',
        content: fallbackAnalysis.socraticOpening,
      };
      
      setMessages([initialMessage]);
      setShowNewProblemModal(false);
      setStep('chat');
    } finally {
      setModalAnalyzing(false);
    }
  };

  const startTextChat = () => {
    if (!analysis) return;
    
    const initialMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'tutor',
      content: analysis.socraticOpening,
    };
    
    setMessages([initialMessage]);
    setStep('chat');
    if (voiceEnabled) speakText(analysis.socraticOpening, initialMessage.id);
  };

  const startTextChatWithAnalysis = (analysisData: QuestionAnalysis) => {
    const initialMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'tutor',
      content: analysisData.socraticOpening,
    };
    
    setMessages([initialMessage]);
    setStep('chat');
    if (voiceEnabled) speakText(analysisData.socraticOpening, initialMessage.id);
  };


  const handleSelectSyllabusTopic = (topic: { id: string; name: string; slug: string; section?: string | null }) => {
    setSelectedTopic(topic);
    setQuestionText(`I need help with ${topic.name}`);
    // Create analysis for the topic and go directly to chat
    const topicAnalysis = {
      questionSummary: `Practice question on ${topic.name}`,
      topic: topic.name,
      difficulty: 'A-Level',
      socraticOpening: `Alright, let's work on ${topic.name}. What specific aspect are you finding tricky, or would you like me to give you a practice question?`,
    };
    setAnalysis(topicAnalysis);
    startTextChatWithAnalysis(topicAnalysis);
  };

  const streamChat = async (allMessages: Message[]): Promise<{ reply_messages: string[]; student_behavior?: string }> => {
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
        })),
        questionContext: `A-Level student (${examBoard || 'Unknown board'}), current grade: ${currentGrade || 'Unknown'}, target: ${targetGrade || 'Unknown'}. Struggles with: ${struggles || 'Not specified'}. Question: ${questionText || 'See attached image'}`,
      }),
    });

    if (!response.ok) throw new Error('Failed to chat');

    const data = await response.json();
    // Handle both new reply_messages array and legacy reply_text
    const messages = data.reply_messages || [data.reply_text || data.content || "I'm having trouble responding. Try again?"];
    return {
      reply_messages: messages,
      student_behavior: data.student_behavior,
    };
  };

  const sendMessage = async (content?: string, inputMethod: 'text' | 'voice' | 'photo' = 'text') => {
    const messageContent = content || newMessage.trim();
    if (!messageContent || sending) return;

    // Track first input method for beta testing
    if (BETA_MODE && !firstInputMethod) {
      setFirstInputMethod(inputMethod);
    }

    if (!UNLIMITED_TESTING && exchangeCount >= MAX_FREE_EXCHANGES) {
      sessionStorage.setItem('pendingQuestion', JSON.stringify({
        text: questionText || 'See attached image',
        image: imagePreview,
        analysis,
        messages,
      }));
      navigate('/auth');
      return;
    }

    setSending(true);
    stopSpeaking();
    setNewMessage('');
    setShowInput(false);

    const studentMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'student',
      content: messageContent,
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

      // Replace placeholder with first message using typing effect
      const firstMsg = reply_messages[0];
      const remainingMsgs = reply_messages.slice(1);
      
      // Type out first message
      await typeMessage(placeholderId, firstMsg, student_behavior);
      
      // Auto-play voice for combined messages
      if (voiceEnabled) {
        const fullText = reply_messages.join(' ');
        speakText(fullText, placeholderId);
      }
      
      // Add remaining messages with slight delays and typing effect
      for (let i = 0; i < remainingMsgs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        const msgContent = remainingMsgs[i];
        const msgId = `msg-${Date.now()}-${i}`;
        setMessages((prev) => [
          ...prev,
          { id: msgId, sender: 'tutor', content: '' }
        ]);
        await typeMessage(msgId, msgContent);
      }

      if (!UNLIMITED_TESTING) {
        setExchangeCount((prev) => prev + 1);
        if (exchangeCount + 1 >= MAX_FREE_EXCHANGES) {
          setTimeout(() => {
            toast({
              title: "You're doing great!",
              description: 'Sign up free to keep chatting with Orbit',
            });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please try again.',
      });
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
    }

    setSending(false);
  };

  const clearImage = () => {
    setImagePreview(null);
    setAnalysis(null);
    setIsAnalyzing(false);
    setStep('upload');
  };

  // Handle test me - navigate to arena setup
  const handleTestMe = () => {
    navigate('/practice-arena');
  };

  // Home screen with new design
  if (step === 'home') {
    return (
      <HomeScreen
        topics={topics}
        loadingTopics={loadingTopics}
        onSnapQuestion={() => setStep('upload')}
        onSelectTopic={handleSelectSyllabusTopic}
        onTestMe={handleTestMe}
        onSignIn={() => navigate('/auth')}
        onShowInfo={() => {
          toast({
            title: 'About Orbit',
            description: 'Orbit is your AI maths tutor, available 24/7 to help you ace A-Level Maths. Built by Zero Gravity mentors.',
          });
        }}
      />
    );
  }

  // Setup screen - ask for student context
  if (step === 'setup') {
    const canContinue = currentGrade && targetGrade && examBoard;
    
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => setStep('home')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
          <h2 className="text-lg font-medium">Quick Setup</h2>
          <div className="w-12" />
        </div>

        <main className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full">
          <div className="space-y-2 mb-8">
            <h1 className="text-2xl font-semibold">Tell us about yourself</h1>
            <p className="text-muted-foreground">This helps Orbit give you better, more targeted help.</p>
          </div>

          <div className="space-y-6 flex-1">
            {/* Exam Board */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Board</label>
              <Select value={examBoard} onValueChange={setExamBoard}>
                <SelectTrigger className="w-full h-12 bg-card border-border">
                  <SelectValue placeholder="Select your exam board" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="AQA">AQA</SelectItem>
                  <SelectItem value="Edexcel">Edexcel</SelectItem>
                  <SelectItem value="OCR">OCR</SelectItem>
                  <SelectItem value="OCR MEI">OCR MEI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Grade */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Grade</label>
              <Select value={currentGrade} onValueChange={setCurrentGrade}>
                <SelectTrigger className="w-full h-12 bg-card border-border">
                  <SelectValue placeholder="What grade are you getting now?" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="U">U</SelectItem>
                  <SelectItem value="E">E</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="A*">A*</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Grade */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Grade</label>
              <Select value={targetGrade} onValueChange={setTargetGrade}>
                <SelectTrigger className="w-full h-12 bg-card border-border">
                  <SelectValue placeholder="What grade are you aiming for?" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="E">E</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="A*">A*</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Struggles */}
            <div className="space-y-2">
              <label className="text-sm font-medium">What do you struggle with most? <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Select value={struggles} onValueChange={setStruggles}>
                <SelectTrigger className="w-full h-12 bg-card border-border">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="Pure - Algebra & Functions">Pure - Algebra & Functions</SelectItem>
                  <SelectItem value="Pure - Coordinate Geometry">Pure - Coordinate Geometry</SelectItem>
                  <SelectItem value="Pure - Sequences & Series">Pure - Sequences & Series</SelectItem>
                  <SelectItem value="Pure - Trigonometry">Pure - Trigonometry</SelectItem>
                  <SelectItem value="Pure - Exponentials & Logs">Pure - Exponentials & Logs</SelectItem>
                  <SelectItem value="Pure - Differentiation">Pure - Differentiation</SelectItem>
                  <SelectItem value="Pure - Integration">Pure - Integration</SelectItem>
                  <SelectItem value="Pure - Vectors">Pure - Vectors</SelectItem>
                  <SelectItem value="Statistics">Statistics</SelectItem>
                  <SelectItem value="Mechanics">Mechanics</SelectItem>
                  <SelectItem value="Proof">Proof</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            <Button
              onClick={() => setStep('upload')}
              disabled={!canContinue}
              className="w-full h-14 text-base rounded-full font-medium"
            >
              Continue
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Camera/upload screen - simplified since syllabus is on home
  if (step === 'upload') {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => setStep('home')} className="text-sm text-white/70 hover:text-white transition-colors">← Back</button>
          <h2 className="text-lg font-medium text-white">Snap a Question</h2>
          <div className="w-12" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-6">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
            
            {/* Camera button - primary action */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 rounded-2xl border-2 border-primary/50 bg-primary/10 flex flex-col items-center gap-4 transition-all hover:border-primary hover:bg-primary/20"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,250,215,0.3)' }}>
                <Camera className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium text-lg">Take Photo</p>
                <p className="text-white/50 text-sm">Snap your textbook or worksheet</p>
              </div>
            </button>

            {/* Upload from gallery */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreview(reader.result as string);
                      setStep('preview');
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="w-full p-4 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center gap-2 transition-all hover:bg-white/10"
            >
              <Upload className="h-5 w-5 text-white/60" />
              <span className="text-white/60">Upload from gallery</span>
            </button>
          </div>

          {/* Or type option */}
          <div className="w-full max-w-sm mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-white/50 text-sm">or type your question</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type or paste your question here..."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-[100px] resize-none rounded-xl"
            />
            {questionText.trim() && (
              <Button
                onClick={startTextOnlyChat}
                disabled={isAnalyzing}
                className="w-full mt-3 bg-primary text-background hover:bg-primary/90"
              >
                {isAnalyzing ? 'Starting...' : 'Continue'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Preview screen with shimmer
  if (step === 'preview') {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-background">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => !isAnalyzing && setStep('upload')}
              className={`text-sm transition-colors ${isAnalyzing ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ← Back
            </button>
          </div>

          <div className="flex-1 flex flex-col space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {isAnalyzing ? 'Analysing...' : 'Review your question'}
              </h2>
              <p className="text-muted-foreground">
                {isAnalyzing ? 'Orbit is figuring out how to help' : 'Add details to get better help'}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-xl">
              <img
                src={imagePreview!}
                alt="Question"
                className={`w-full border border-border rounded-xl transition-all duration-300 ${isAnalyzing ? 'opacity-70' : ''}`}
              />
              {isAnalyzing && (
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  <div 
                    className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,250,215,0.15) 50%, transparent 100%)' }}
                  />
                </div>
              )}
              {!isAnalyzing && (
                <button onClick={clearImage} className="absolute top-3 right-3 p-2 rounded-full bg-background/90 backdrop-blur-sm hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className={`transition-opacity duration-300 ${isAnalyzing ? 'opacity-30 pointer-events-none' : ''}`}>
              <Textarea
                placeholder="Add context or specify what you need help with (optional)"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="min-h-[100px] rounded-xl bg-muted border-0 resize-none focus-visible:ring-1 focus-visible:ring-primary"
                disabled={isAnalyzing}
              />
            </div>

            <div className="space-y-3 pt-2">
              <Button onClick={analyzeAndStartChat} disabled={isAnalyzing} className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-70">
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Thinking...
                  </span>
                ) : (
                  <>Get Help<ArrowRight className="h-4 w-4 ml-2" /></>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">No sign-up required</p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // Chat screen
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with burger menu */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <BurgerMenu
            onBrowseSyllabus={() => {
              setStep('home');
              setMessages([]);
              setImagePreview(null);
              setAnalysis(null);
            }}
            onSettings={() => setStep('setup')}
          />
          <div className="w-8" /> {/* Spacer for symmetry */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewProblemModal(true)}
              className="rounded-full text-muted-foreground hover:text-foreground gap-1.5 px-3"
            >
              <Camera className="h-4 w-4" />
              <span className="text-sm">New Problem</span>
            </Button>
            {BETA_MODE && messages.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEndSession}
                className="rounded-full text-muted-foreground hover:text-foreground"
                title="End Session"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Question Card */}
          {imagePreview && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-background font-bold text-sm">
                    {betaTesterName?.charAt(0).toUpperCase() || 'S'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-sm">{betaTesterName || 'Student'}</span>
                  {analysis?.difficulty && <span className="text-xs text-muted-foreground ml-2">{analysis.difficulty}</span>}
                </div>
              </div>
              <img src={imagePreview} alt="Question" className="w-full max-h-48 object-contain bg-muted/30" />
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`rounded-2xl p-4 ${message.sender === 'tutor' ? 'bg-card border border-border' : 'bg-primary/10 ml-8'}`}
            >
              {message.sender === 'tutor' && (
                <div className="flex items-center gap-2 mb-2">
                  <img 
                    src={orbitIcon} 
                    alt="Orbit" 
                    className={`w-6 h-6 rounded-full object-cover ${speakingMessageId === message.id ? 'animate-pulse' : ''}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {speakingMessageId === message.id ? 'Orbit is speaking...' : 'Orbit'}
                  </span>
                </div>
              )}
              {message.imageUrl && (
                <img src={message.imageUrl} alt="Uploaded" className="w-full max-h-32 object-contain rounded-lg mb-2" />
              )}
              <p className={`text-sm leading-relaxed ${message.sender === 'student' ? 'text-right' : ''}`}>
                {message.content || (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </p>
            </div>
          ))}

          {/* Signup prompt after limit */}
          {!UNLIMITED_TESTING && exchangeCount >= MAX_FREE_EXCHANGES && (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 text-center space-y-4 animate-fade-in">
              <h3 className="font-semibold text-lg">You&apos;re doing great! 🎉</h3>
              <p className="text-sm text-muted-foreground">Sign up free to keep chatting with Orbit and save your progress</p>
              <Button onClick={() => {
                sessionStorage.setItem('pendingQuestion', JSON.stringify({ text: questionText, image: imagePreview, analysis, messages }));
                navigate('/auth');
              }} className="rounded-full">
                Continue Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Free exchanges counter */}
      {!UNLIMITED_TESTING && (
        <div className="text-center py-2 text-xs text-muted-foreground">
          {exchangeCount < MAX_FREE_EXCHANGES ? (
            `${MAX_FREE_EXCHANGES - exchangeCount} free messages left`
          ) : (
            'Sign up to continue'
          )}
        </div>
      )}

      {/* Click outside to close input */}
      {showInput && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowInput(false)} 
        />
      )}

      {/* Bottom action bar */}
      {(UNLIMITED_TESTING || exchangeCount < MAX_FREE_EXCHANGES) && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
          <div className="max-w-2xl mx-auto">
            {/* Hidden file inputs for image uploads */}
            <input 
              ref={workingFileInputRef} 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={(e) => handleImageUpload(e, 'working')} 
            />
            <input 
              ref={questionFileInputRef} 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={(e) => handleImageUpload(e, 'question')} 
            />
            
            {/* Pending image with intent chips + optional text */}
            {pendingImage ? (
              <div className="flex flex-col items-center gap-4 w-full">
                {/* Image preview */}
                <div className="relative">
                  <img 
                    src={pendingImage.url} 
                    alt="Your upload" 
                    className="max-h-32 rounded-xl border border-border"
                  />
                  <button
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
                
                {/* Intent chips based on mode */}
                <div className="flex flex-wrap justify-center gap-2">
                  {pendingImage.mode === 'working' ? (
                    <>
                      <button
                        onClick={() => confirmImageUpload("Check my working")}
                        className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Check my working
                      </button>
                      <button
                        onClick={() => confirmImageUpload("Is this right?")}
                        className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Is this right?
                      </button>
                      <button
                        onClick={() => confirmImageUpload("What's next?")}
                        className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        What's next?
                      </button>
                      <button
                        onClick={() => confirmImageUpload("I'm stuck here")}
                        className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
                      >
                        I'm stuck here
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => confirmImageUpload("Help me solve this")}
                        className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Help me solve this
                      </button>
                      <button
                        onClick={() => confirmImageUpload("Where do I start?")}
                        className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Where do I start?
                      </button>
                      <button
                        onClick={() => confirmImageUpload("Explain the question")}
                        className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
                      >
                        Explain the question
                      </button>
                    </>
                  )}
                </div>
                
                {/* Optional text input */}
                <div className="w-full flex items-center gap-2">
                  <Input
                    placeholder="Add context or specify what you need help with (optional)"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        confirmImageUpload(newMessage.trim() || (pendingImage.mode === 'working' ? "Check my working" : "Help me with this"));
                      }
                    }}
                    className="flex-1 rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                  />
                  <button 
                    onClick={() => confirmImageUpload(newMessage.trim() || (pendingImage.mode === 'working' ? "Check my working" : "Help me with this"))}
                    disabled={sending}
                    className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50"
                    style={{ 
                      background: 'linear-gradient(135deg, #00FAD7 0%, #00C4AA 100%)', 
                    }}
                  >
                    <Send className="h-5 w-5 text-background" />
                  </button>
                </div>
              </div>
            ) : showInput ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={sending}
                  autoFocus
                  className="flex-1 rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                />
                <button 
                  onClick={() => newMessage.trim() && sendMessage()}
                  disabled={sending || !newMessage.trim()}
                  className="w-12 h-12 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="h-5 w-5 text-primary-foreground" />
                </button>
                <button 
                  onClick={() => setShowInput(false)}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {/* Primary CTA: Add working */}
                <button 
                  onClick={() => workingFileInputRef.current?.click()} 
                  disabled={sending} 
                  className="flex items-center gap-2 px-6 py-3 rounded-full disabled:opacity-50 transition-all duration-300"
                  style={{ 
                    background: 'linear-gradient(135deg, #00FAD7 0%, #00C4AA 100%)', 
                    boxShadow: '0 4px 20px rgba(0,250,215,0.3)' 
                  }}
                >
                  {sending ? (
                    <div className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5 text-background" />
                      <span className="font-medium text-background">Add working</span>
                    </>
                  )}
                </button>
                
                {/* Secondary actions */}
                <div className="flex items-center gap-4 text-sm">
                  <button 
                    onClick={() => questionFileInputRef.current?.click()}
                    disabled={sending}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    New question
                  </button>
                  <span className="text-muted-foreground/50">•</span>
                  <button 
                    onClick={() => setShowInput(true)}
                    disabled={sending}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Type a line
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Beta Entry Modal */}
      <BetaEntryModal 
        open={showBetaEntry} 
        onComplete={handleBetaEntryComplete} 
      />
      
      {/* Post-Session Survey Modal */}
      <PostSessionSurvey 
        open={showSurvey} 
        onComplete={handleSurveyComplete} 
      />
      
      {/* New Problem Modal */}
      <NewProblemModal
        open={showNewProblemModal}
        onOpenChange={setShowNewProblemModal}
        onSubmit={handleNewProblemSubmit}
        isAnalyzing={modalAnalyzing}
      />
    </div>
  );
}
