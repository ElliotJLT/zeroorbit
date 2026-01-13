import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import HomeScreen from '@/components/HomeScreen';
import ChatView from '@/components/ChatView';
import QuestionReviewScreen from '@/components/QuestionReviewScreen';
import VoiceSession from '@/components/VoiceSession';
import StudyLayout from '@/components/StudyLayout';
import { useChat } from '@/hooks/useChat';
import type { ActiveContent } from '@/components/ContentPanel';
import type { Source } from '@/components/SourcesPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Step = 'home' | 'setup' | 'review' | 'chat';

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  
  // Check for past paper navigation state
  const locationState = location.state as { 
    fromPastPaper?: boolean; 
    questionContext?: string; 
    mode?: 'coach' | 'check';
    // PDF content
    pdfContent?: {
      path: string;
      name: string;
      date: string;
      page: number;
      selectedText: string;
    };
  } | null;
  
  const [step, setStep] = useState<Step>('home');
  
  // Active content state - persists image/PDF for reference during chat
  const [activeContent, setActiveContent] = useState<ActiveContent | null>(null);
  
  // Setup state (only for users without profile)
  const [examBoard, setExamBoard] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [tier, setTier] = useState('');
  
  // Image state
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ topic?: string; difficulty?: string; socraticOpening?: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showVoiceSession, setShowVoiceSession] = useState(false);
  
  // Sources/content panel state lifted from ChatView
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<number | undefined>();
  const [contentPanelOpen, setContentPanelOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Callback for opening sources panel
  const handleOpenSources = useCallback((sources: Source[], activeId?: number) => {
    setCurrentSources(sources);
    setActiveSourceId(activeId);
    setSourcesOpen(true);
    
    // Scroll to source after panel opens
    if (activeId) {
      setTimeout(() => {
        const sourceEl = document.getElementById(`source-${activeId}`);
        sourceEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, []);

  // Build user context from profile or local state
  const userContext = {
    examBoard: profile?.exam_board || examBoard || undefined,
    yearGroup: profile?.year_group || yearGroup || undefined,
    targetGrade: profile?.target_grade || targetGrade || undefined,
    tier: tier || undefined,
  };

  // Unified chat hook
  const chat = useChat({
    user,
    userContext,
    onFirstInput: (method) => {
      console.log('First input method:', method);
    },
  });

  // Check if user needs onboarding
  useEffect(() => {
    if (!authLoading && user && profile && !profile.onboarding_completed) {
      navigate('/onboarding');
    }
  }, [authLoading, user, profile, navigate]);

  // Handle navigation from Past Papers
  useEffect(() => {
    if (locationState?.fromPastPaper) {
      if (locationState.pdfContent) {
        // PDF with text selection - store content and start chat
        const { path, name, date, page, selectedText } = locationState.pdfContent;
        setActiveContent({
          type: 'pdf',
          pdfPath: path,
          pdfName: name,
          pdfDate: date,
          pdfPage: page,
          selectedText,
        });
        
        // Build context message for the chat
        const contextMessage = `I'm working on ${name} (${date}), page ${page}. Here's the question I need help with:\n\n"${selectedText}"`;
        chat.sendMessage(contextMessage);
        setStep('chat');
      } else if (locationState.questionContext) {
        // Legacy flow - just text context
        chat.sendMessage(locationState.questionContext);
        setStep('chat');
      }
      
      // Clear the location state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [locationState]);

  // Handle image selection from home screen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setRawImage(base64);
        
        // Check if we need setup first (no profile context)
        const hasContext = profile?.exam_board || examBoard;
        if (!hasContext) {
          setStep('setup');
        } else {
          setStep('review');
        }
        
        // Run analysis in background
        runPreviewAnalysis(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run analysis in background for tags
  const runPreviewAnalysis = async (imageUrl: string) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-question', {
        body: { imageBase64: imageUrl },
      });
      
      if (!error && data && data.error !== 'not_maths') {
        setAnalysisResult({
          topic: data.topic,
          difficulty: data.difficulty,
          socraticOpening: data.socraticOpening,
        });
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle setup completion
  const handleSetupComplete = () => {
    setStep('review');
  };

  // Handle review completion (crop + mode selection done)
  const handleReviewComplete = async (croppedImageUrl: string, mode: 'coach' | 'check', originalImageUrl?: string) => {
    // Upload image if needed
    let finalImageUrl = croppedImageUrl;
    if (croppedImageUrl.startsWith('data:')) {
      try {
        const fileName = `question-${Date.now()}.jpg`;
        const base64Data = croppedImageUrl.split(',')[1];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(fileName, blob);
        
        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('question-images')
            .getPublicUrl(uploadData.path);
          finalImageUrl = publicUrl;
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    
    // Store the content for persistence - keep original for re-cropping
    setActiveContent({
      type: 'image',
      croppedImageUrl: finalImageUrl,
      originalImageUrl: originalImageUrl || rawImage || undefined,
    });
    
    // Set analysis if available
    if (analysisResult) {
      chat.setAnalysis(analysisResult);
    }
    
    // Move to chat screen - DON'T clear rawImage yet (needed for re-crop)
    setStep('chat');
    setRawImage(null);
    setAnalysisResult(null);
    
    // Send the image message directly (no pending state)
    chat.sendImageMessage(finalImageUrl, mode);
  };

  // Handle review cancel
  const handleReviewCancel = () => {
    setRawImage(null);
    setAnalysisResult(null);
    setStep('home');
  };

  // Handle re-select from content panel (re-crop different section)
  const handleReselectImage = () => {
    if (activeContent?.originalImageUrl) {
      setRawImage(activeContent.originalImageUrl);
      setStep('review');
    }
  };

  // Handle new PDF text selection from content panel
  const handleReselectPdf = (text: string, mode: 'coach' | 'check', page: number) => {
    if (activeContent?.type === 'pdf') {
      // Update the page in active content
      setActiveContent(prev => prev ? { ...prev, pdfPage: page, selectedText: text } : null);
      
      // Send as new message in existing chat
      const contextMessage = `Now I'm looking at page ${page}:\n\n"${text}"`;
      chat.sendMessage(contextMessage);
    }
  };

  // Handle new problem (reset chat)
  const handleNewProblem = () => {
    chat.resetChat();
    setRawImage(null);
    setAnalysisResult(null);
    setActiveContent(null); // Clear persisted content
    setStep('home');
  };

  // Navigate to settings
  const handleSettings = () => {
    navigate('/settings');
  };

  // ==================== RENDER ====================

  // Unified review screen (crop + mode selection)
  if (step === 'review' && rawImage) {
    return (
      <QuestionReviewScreen
        imageUrl={rawImage}
        analysisResult={analysisResult}
        isAnalyzing={isAnalyzing}
        onComplete={handleReviewComplete}
        onCancel={handleReviewCancel}
      />
    );
  }

  // Home screen
  if (step === 'home') {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
        <HomeScreen
          topics={[]}
          loadingTopics={false}
          isAuthenticated={!!user}
          onSnapQuestion={() => fileInputRef.current?.click()}
          onSelectTopic={() => {}}
          onTestMe={() => navigate('/practice-arena')}
          onSignIn={() => navigate('/auth')}
        />
      </>
    );
  }

  // Setup screen (for users without profile context)
  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={() => {
              setStep('home');
              setRawImage(null);
              setAnalysisResult(null);
            }}
            className="p-2 -ml-2 hover:bg-muted rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="font-medium">Quick Setup</span>
          <div className="w-9" />
        </header>
        
        <div className="flex-1 p-6 space-y-6">
          <div className="text-center space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Tell me about your course</h2>
            <p className="text-muted-foreground text-sm">This helps me give you relevant feedback</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Board</label>
              <Select value={examBoard} onValueChange={setExamBoard}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select exam board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aqa">AQA</SelectItem>
                  <SelectItem value="edexcel">Edexcel</SelectItem>
                  <SelectItem value="ocr">OCR</SelectItem>
                  <SelectItem value="wjec">WJEC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Year Group</label>
              <Select value={yearGroup} onValueChange={setYearGroup}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select year group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Year 10</SelectItem>
                  <SelectItem value="11">Year 11</SelectItem>
                  <SelectItem value="12">Year 12</SelectItem>
                  <SelectItem value="13">Year 13</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Grade</label>
              <Select value={targetGrade} onValueChange={setTargetGrade}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select target grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">Grade 9</SelectItem>
                  <SelectItem value="8">Grade 8</SelectItem>
                  <SelectItem value="7">Grade 7</SelectItem>
                  <SelectItem value="6">Grade 6</SelectItem>
                  <SelectItem value="5">Grade 5</SelectItem>
                  <SelectItem value="A*">A*</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {['10', '11'].includes(yearGroup) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tier</label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="higher">Higher</SelectItem>
                    <SelectItem value="foundation">Foundation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 shrink-0">
          <Button
            onClick={() => {
              handleSetupComplete();
            }}
            disabled={!examBoard || !yearGroup}
            className="w-full h-12"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Voice session overlay
  if (showVoiceSession) {
    // Build config for voice session
    const voiceConfig = {
      userContext: {
        level: profile?.year_group ? `Year ${profile.year_group}` : yearGroup ? `Year ${yearGroup}` : undefined,
        board: profile?.exam_board || examBoard || undefined,
        targetGrade: profile?.target_grade || targetGrade || undefined,
      },
      questionContext: chat.messages.length > 0 ? chat.messages[0].content : undefined,
    };

    return (
      <VoiceSession
        config={voiceConfig}
        onEnd={() => setShowVoiceSession(false)}
        onSwitchToText={() => setShowVoiceSession(false)}
      />
    );
  }

  // Chat screen
  return (
    <StudyLayout
      activeContent={activeContent}
      currentSources={currentSources}
      activeSourceId={activeSourceId}
      sourcesOpen={sourcesOpen}
      onSourcesOpenChange={setSourcesOpen}
      contentPanelOpen={contentPanelOpen}
      onContentPanelOpenChange={setContentPanelOpen}
      onReselectImage={handleReselectImage}
      onReselectPdf={handleReselectPdf}
      onSettings={handleSettings}
    >
      <ChatView
        messages={chat.messages}
        sending={chat.sending}
        guestExchangeCount={chat.guestExchangeCount}
        guestLimit={chat.guestLimit}
        isAtLimit={chat.isAtLimit}
        onSendMessage={chat.sendMessage}
        onSendImageMessage={chat.sendImageMessage}
        onNewProblem={handleNewProblem}
        onSettings={handleSettings}
        isAuthenticated={!!user}
        onStartVoiceSession={() => setShowVoiceSession(true)}
        sessionId={chat.sessionId}
        hasActiveContent={!!activeContent}
        onOpenContent={() => setContentPanelOpen(true)}
        onOpenSources={handleOpenSources}
      />
    </StudyLayout>
  );
}
