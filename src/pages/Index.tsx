import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, X, Check, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import HomeScreen from '@/components/HomeScreen';
import ChatView from '@/components/ChatView';
import ImageEditor from '@/components/ImageEditor';
import { useChat } from '@/hooks/useChat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Step = 'home' | 'setup' | 'preview' | 'chat';

export default function Index() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [step, setStep] = useState<Step>('home');
  
  // Setup state (only for users without profile)
  const [examBoard, setExamBoard] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [tier, setTier] = useState('');
  
  // Image preview state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'coach' | 'check' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ topic?: string; difficulty?: string; socraticOpening?: string } | null>(null);
  
  // Image editing state
  const [isEditing, setIsEditing] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle image selection from home screen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setRawImage(base64);
        setIsEditing(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditorComplete = (editedUrl: string) => {
    setImagePreview(editedUrl);
    setIsEditing(false);
    setRawImage(null);
    
    // Check if we need setup first (no profile context)
    const hasContext = profile?.exam_board || examBoard;
    if (!hasContext) {
      setStep('setup');
    } else {
      setStep('preview');
    }
    
    // Run analysis in background
    runPreviewAnalysis(editedUrl);
  };

  const handleEditorCancel = () => {
    setIsEditing(false);
    setRawImage(null);
  };

  // Run analysis in background for tags
  const runPreviewAnalysis = async (imageUrl: string) => {
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
    }
  };

  // Handle setup completion
  const handleSetupComplete = () => {
    setStep('preview');
  };

  // Handle starting learning from preview
  const handleStartLearning = async () => {
    if (!imagePreview || !selectedMode) return;
    
    setIsAnalyzing(true);
    
    // Upload image if needed
    let finalImageUrl = imagePreview;
    if (imagePreview.startsWith('data:')) {
      try {
        const fileName = `question-${Date.now()}.jpg`;
        const base64Data = imagePreview.split(',')[1];
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
    
    // Set analysis and initialize chat with opening if available
    if (analysisResult) {
      chat.setAnalysis(analysisResult);
      if (analysisResult.socraticOpening && selectedMode === 'coach') {
        chat.initializeWithOpening(analysisResult.socraticOpening);
      }
    }
    
    // Start chat with image
    chat.handleImageUpload(finalImageUrl, selectedMode);
    
    setStep('chat');
    setIsAnalyzing(false);
  };

  // Handle new problem (reset chat)
  const handleNewProblem = () => {
    chat.resetChat();
    setImagePreview(null);
    setSelectedMode(null);
    setAnalysisResult(null);
    setStep('home');
  };

  // Navigate to settings
  const handleSettings = () => {
    navigate('/settings');
  };

  // ==================== RENDER ====================

  // Image editor fullscreen
  if (isEditing && rawImage) {
    return (
      <ImageEditor
        imageUrl={rawImage}
        onComplete={handleEditorComplete}
        onCancel={handleEditorCancel}
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
          capture="environment"
          className="hidden"
          onChange={handleImageChange}
        />
        <HomeScreen
          topics={[]}
          loadingTopics={false}
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
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            onClick={() => {
              setStep('home');
              setImagePreview(null);
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
        
        <div className="p-6">
          <Button
            onClick={handleSetupComplete}
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

  // Preview screen
  if (step === 'preview') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            onClick={() => {
              setStep('home');
              setImagePreview(null);
              setSelectedMode(null);
              setAnalysisResult(null);
            }}
            className="p-2 -ml-2 hover:bg-muted rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="font-medium">Review Your Question</span>
          <div className="w-9" />
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Image preview */}
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Question"
                className="w-full rounded-xl border border-border"
              />
              {analysisResult && (
                <div className="absolute bottom-3 left-3 flex gap-2">
                  {analysisResult.topic && (
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary backdrop-blur-sm">
                      {analysisResult.topic}
                    </span>
                  )}
                  {analysisResult.difficulty && (
                    <span className="px-2 py-1 text-xs rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm">
                      {analysisResult.difficulty}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Mode selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">How would you like help?</p>
            
            <button
              onClick={() => setSelectedMode('coach')}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                selectedMode === 'coach'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMode === 'coach' ? 'border-primary bg-primary' : 'border-muted-foreground'
              }`}>
                {selectedMode === 'coach' && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div className="text-left">
                <p className="font-medium">🎓 Coach me through it</p>
                <p className="text-sm text-muted-foreground">
                  I'll guide you step-by-step with hints and questions
                </p>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedMode('check')}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                selectedMode === 'check'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMode === 'check' ? 'border-primary bg-primary' : 'border-muted-foreground'
              }`}>
                {selectedMode === 'check' && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div className="text-left">
                <p className="font-medium">📝 Check my working</p>
                <p className="text-sm text-muted-foreground">
                  I'll mark your answer and give feedback on errors
                </p>
              </div>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <Button
            onClick={handleStartLearning}
            disabled={!selectedMode || isAnalyzing}
            className="w-full h-12"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                Start Learning
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Chat screen
  return (
    <ChatView
      messages={chat.messages}
      sending={chat.sending}
      pendingImage={chat.pendingImage}
      guestExchangeCount={chat.guestExchangeCount}
      guestLimit={chat.guestLimit}
      isAtLimit={chat.isAtLimit}
      onSendMessage={chat.sendMessage}
      onImageUpload={chat.handleImageUpload}
      onConfirmImage={chat.confirmImageUpload}
      onCancelImage={chat.cancelPendingImage}
      onNewProblem={handleNewProblem}
      onSettings={handleSettings}
      isAuthenticated={!!user}
    />
  );
}
