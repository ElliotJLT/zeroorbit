import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, X, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import orbitLogo from '@/assets/orbit-logo.png';
import BetaEntryModal from '@/components/BetaEntryModal';
import PostSessionSurvey from '@/components/PostSessionSurvey';
import HomeScreen from '@/components/HomeScreen';
import { GuestChat } from '@/components/GuestChat';
import { useGuestChat, type QuestionAnalysis } from '@/hooks/useGuestChat';
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

const BETA_MODE = true;

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'home' | 'setup' | 'upload' | 'preview' | 'onboarding' | 'chat'>('home');
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string; slug: string } | null>(null);
  
  // Check if first session (no saved context)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => 
    localStorage.getItem('orbitOnboardingComplete') === 'true'
  );
  
  // Topics for syllabus browser
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [questionText, setQuestionText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<QuestionAnalysis | null>(null);
  const [selectedMode, setSelectedMode] = useState<'coach' | 'check'>('coach');
  const [pendingAnalysis, setPendingAnalysis] = useState<QuestionAnalysis | null>(null);
  
  // Student context - load from localStorage if available
  const [currentGrade, setCurrentGrade] = useState(() => localStorage.getItem('orbitCurrentGrade') || '');
  const [targetGrade, setTargetGrade] = useState(() => localStorage.getItem('orbitTargetGrade') || '');
  const [examBoard, setExamBoard] = useState(() => localStorage.getItem('orbitExamBoard') || '');
  const [struggles, setStruggles] = useState('');
  
  // Beta testing state
  const [betaTesterName, setBetaTesterName] = useState<string | null>(() => 
    BETA_MODE ? localStorage.getItem('betaTesterName') : null
  );
  const [showBetaEntry, setShowBetaEntry] = useState(BETA_MODE && !localStorage.getItem('betaTesterName'));
  const [showSurvey, setShowSurvey] = useState(false);
  const [firstInputMethod, setFirstInputMethod] = useState<'text' | 'voice' | 'photo' | null>(null);
  const [notMathsError, setNotMathsError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the refactored guest chat hook - voice OFF by default
  const guestChat = useGuestChat({
    userContext: {
      currentGrade,
      targetGrade,
      examBoard,
      struggles,
      questionText,
      tutorMode: selectedMode,
    },
    onFirstInput: (method) => {
      if (!firstInputMethod) setFirstInputMethod(method);
    },
  });

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setStep('preview');
        // Start analysis immediately for tags
        runPreviewAnalysis(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run analysis in background to show topic/difficulty tags on preview
  const runPreviewAnalysis = async (base64: string) => {
    setIsAnalyzing(true);
    setNotMathsError(null);
    
    try {
      const response = await supabase.functions.invoke('analyze-question', {
        body: { 
          imageBase64: base64,
          questionText: questionText 
        },
      });

      if (response.data?.error === 'not_maths') {
        setNotMathsError(response.data.rejectionReason || "This doesn't appear to be a maths question");
        setIsAnalyzing(false);
        return;
      }

      if (response.error) throw new Error(response.error.message);

      const analysisData = response.data as QuestionAnalysis;
      setAnalysis(analysisData);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
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
    console.log('Beta session complete:', {
      betaTesterName,
      firstInputMethod,
      messageCount: guestChat.messages.length,
      ...data,
    });
    
    setShowSurvey(false);
    toast({
      title: 'Thanks for your feedback! 🙏',
      description: 'Your input helps us improve Orbit.',
    });
    
    // Reset for next session
    setStep('home');
    guestChat.resetChat();
    setFirstInputMethod(null);
  };

  // End session and show survey
  const handleEndSession = () => {
    if (BETA_MODE && guestChat.messages.length > 2) {
      setShowSurvey(true);
    } else {
      setStep('home');
      guestChat.resetChat();
    }
  };

  const analyzeAndStartChat = async () => {
    if (!imagePreview) return;
    
    setIsAnalyzing(true);
    setNotMathsError(null);
    
    try {
      const response = await supabase.functions.invoke('analyze-question', {
        body: { 
          imageBase64: imagePreview,
          questionText: questionText 
        },
      });

      // Check for not_maths error
      if (response.data?.error === 'not_maths') {
        setNotMathsError(response.data.rejectionReason || "This doesn't appear to be a maths question");
        setIsAnalyzing(false);
        return;
      }

      if (response.error) throw new Error(response.error.message);

      const analysisData = response.data as QuestionAnalysis;
      setAnalysis(analysisData);
      
      // Go directly to text chat with analysis
      startTextChatWithAnalysis(analysisData);
      
    } catch (error) {
      console.error('Analysis error:', error);
      const fallbackAnalysis: QuestionAnalysis = {
        questionSummary: questionText || 'Question from image',
        topic: 'Unknown',
        difficulty: 'Unknown',
        socraticOpening: "I can see your question. What's the first value or expression you need to identify here?",
      };
      setAnalysis(fallbackAnalysis);
      startTextChatWithAnalysis(fallbackAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startTextChatWithAnalysis = (analysisData: QuestionAnalysis) => {
    guestChat.initializeWithOpening(analysisData.socraticOpening);
    setStep('chat');
  };

  // Handler for NewProblemModal submission from chat
  const handleNewProblemSubmit = async (newImageUrl: string | null, newQuestionText: string) => {
    // Reset current session state
    guestChat.resetChat();
    setAnalysis(null);
    setImagePreview(newImageUrl);
    setQuestionText(newQuestionText);
    
    try {
      const response = await supabase.functions.invoke('analyze-question', {
        body: { 
          imageBase64: newImageUrl,
          questionText: newQuestionText 
        },
      });

      if (response.data?.error === 'not_maths') {
        setNotMathsError(response.data.rejectionReason || "This doesn't appear to be a maths question");
        setStep('preview');
        return;
      }

      let analysisData: QuestionAnalysis;
      
      if (response.error) {
        analysisData = {
          questionSummary: newQuestionText || 'Question from image',
          topic: 'Unknown',
          difficulty: 'Unknown',
          socraticOpening: "I can see your question. What's the first thing you need to find here?",
        };
      } else {
        analysisData = response.data as QuestionAnalysis;
      }
      
      setNotMathsError(null);
      setAnalysis(analysisData);
      guestChat.initializeWithOpening(analysisData.socraticOpening);
      setFirstInputMethod(null);
      
    } catch (error) {
      console.error('Analysis error:', error);
      const fallbackAnalysis: QuestionAnalysis = {
        questionSummary: newQuestionText || 'Question from image',
        topic: 'Unknown',
        difficulty: 'Unknown',
        socraticOpening: "I can see your question. What's the first thing you need to find here?",
      };
      
      setAnalysis(fallbackAnalysis);
      guestChat.initializeWithOpening(fallbackAnalysis.socraticOpening);
    }
  };

  const handleSelectSyllabusTopic = (topic: { id: string; name: string; slug: string; section?: string | null }) => {
    setSelectedTopic(topic);
    setQuestionText(`I need help with ${topic.name}`);
    const topicAnalysis: QuestionAnalysis = {
      questionSummary: `Practice question on ${topic.name}`,
      topic: topic.name,
      difficulty: 'A-Level',
      socraticOpening: `Alright, let's work on ${topic.name}. What specific aspect are you finding tricky, or would you like me to give you a practice question?`,
    };
    setAnalysis(topicAnalysis);
    startTextChatWithAnalysis(topicAnalysis);
  };

  const handleTestMe = () => {
    navigate('/practice-arena');
  };

  const clearImage = () => {
    setImagePreview(null);
    setAnalysis(null);
    setIsAnalyzing(false);
    setStep('upload');
  };

  // ==================== RENDER ====================

  // Home screen
  if (step === 'home') {
    return (
      <HomeScreen
        topics={topics}
        loadingTopics={loadingTopics}
        onSnapQuestion={() => setStep('upload')}
        onSelectTopic={handleSelectSyllabusTopic}
        onTestMe={handleTestMe}
        onSignIn={() => navigate('/auth')}
      />
    );
  }

  // Setup screen
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

  // Upload screen
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
                      const base64 = reader.result as string;
                      setImagePreview(base64);
                      setStep('preview');
                      runPreviewAnalysis(base64);
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
        </div>
      </div>
    );
  }

  // First-session onboarding (quick setup before chat starts)
  if (step === 'onboarding') {
    const canContinue = currentGrade && targetGrade && examBoard;
    
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => setStep('preview')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
          <h2 className="text-lg font-medium">Quick Setup</h2>
          <div className="w-12" />
        </div>

        <main className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full">
          <div className="space-y-2 mb-6">
            <h1 className="text-2xl font-semibold">Tell us about yourself</h1>
            <p className="text-muted-foreground">This helps Orbit tailor help to your exam board.</p>
            <p className="text-xs text-muted-foreground">You can change this later in Settings.</p>
          </div>

          <div className="space-y-5 flex-1">
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
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => {
                // Save onboarding as complete
                localStorage.setItem('orbitOnboardingComplete', 'true');
                localStorage.setItem('orbitExamBoard', examBoard);
                localStorage.setItem('orbitCurrentGrade', currentGrade);
                localStorage.setItem('orbitTargetGrade', targetGrade);
                setHasCompletedOnboarding(true);
                
                // Start chat with pending analysis
                if (pendingAnalysis) {
                  startTextChatWithAnalysis(pendingAnalysis);
                } else {
                  analyzeAndStartChat();
                }
              }}
              disabled={!canContinue}
              className="w-full h-14 text-base rounded-2xl font-medium"
            >
              Start Learning
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Preview screen
  if (step === 'preview') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="p-4 flex items-center justify-center">
          <img src={orbitLogo} alt="Orbit" className="h-8" />
        </div>

        <main className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
          <div className="flex justify-start mb-4">
            <button
              onClick={() => { setStep('upload'); setNotMathsError(null); }}
              disabled={isAnalyzing}
              className={`text-sm transition-colors ${isAnalyzing ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ← Back
            </button>
          </div>

          <div className="flex-1 flex flex-col space-y-6 animate-fade-in">
            {notMathsError ? (
              <>
                <div className="text-center space-y-3">
                  <div className="text-5xl mb-4">🚀</div>
                  <h2 className="text-2xl font-semibold tracking-tight text-destructive">
                    Houston, we have a problem
                  </h2>
                  <p className="text-muted-foreground">
                    That doesn't look like a maths question
                  </p>
                  <p className="text-sm text-muted-foreground/70 italic">
                    "{notMathsError}"
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-xl opacity-50">
                  <img
                    src={imagePreview!}
                    alt="Uploaded image"
                    className="w-full border border-destructive/30 rounded-xl"
                  />
                  <div className="absolute inset-0 bg-destructive/5 rounded-xl" />
                </div>

                <div className="bg-muted/50 rounded-xl p-4 text-center space-y-2">
                  <p className="text-sm font-medium">Please upload:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>📝 A maths equation or problem</li>
                    <li>📄 An exam question from a past paper</li>
                    <li>✍️ Your handwritten working</li>
                  </ul>
                </div>

                <div className="space-y-3 pt-2">
                  <Button 
                    onClick={() => {
                      setNotMathsError(null);
                      setImagePreview(null);
                      setStep('upload');
                    }} 
                    className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <button 
                    onClick={() => {
                      setNotMathsError(null);
                      setImagePreview(null);
                      setStep('home');
                    }}
                    className="w-full h-11 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {isAnalyzing ? 'Analysing...' : 'Review your question'}
                  </h2>
                  <p className="text-muted-foreground">
                    {isAnalyzing ? 'Orbit is figuring out how to help' : 'Choose how you want help'}
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
                    <button onClick={clearImage} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm hover:bg-muted active:scale-95 transition-all flex items-center justify-center">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Context input - below image, shorter */}
                <div className={`transition-opacity duration-300 ${isAnalyzing ? 'opacity-30 pointer-events-none' : ''}`}>
                  <Textarea
                    placeholder="Add context (optional)"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="min-h-[60px] rounded-xl bg-muted border-0 resize-none focus-visible:ring-1 focus-visible:ring-primary text-sm"
                    disabled={isAnalyzing}
                  />
                </div>

                {/* Mode selection - shown when analysis is complete */}
                {!isAnalyzing && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Selectable mode options */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => setSelectedMode('coach')}
                        className={`w-full h-14 rounded-2xl border-2 transition-all flex items-center justify-between px-5 ${
                          selectedMode === 'coach' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border bg-card hover:bg-muted'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-medium">Coach me through it</p>
                          <p className="text-xs text-muted-foreground">Step-by-step guidance</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedMode === 'coach' ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {selectedMode === 'coach' && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => setSelectedMode('check')}
                        className={`w-full h-14 rounded-2xl border-2 transition-all flex items-center justify-between px-5 ${
                          selectedMode === 'check' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border bg-card hover:bg-muted'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-medium">Check my working</p>
                          <p className="text-xs text-muted-foreground">Quick validation & marks</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedMode === 'check' ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {selectedMode === 'check' && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                        </div>
                      </button>
                    </div>
                    
                    {/* Start Learning CTA */}
                    <Button 
                      onClick={() => {
                        // Store the analysis and mode, then check onboarding
                        const finalAnalysis = selectedMode === 'check' 
                          ? {
                              questionSummary: questionText || 'Check my working',
                              topic: analysis?.topic || 'Unknown',
                              difficulty: analysis?.difficulty || 'Unknown',
                              socraticOpening: "I can see your working. Let me check it step by step and give you feedback on what's correct and where any errors are.",
                            }
                          : analysis;
                        
                        setPendingAnalysis(finalAnalysis || null);
                        
                        if (!hasCompletedOnboarding) {
                          setStep('onboarding');
                        } else {
                          if (finalAnalysis) {
                            startTextChatWithAnalysis(finalAnalysis);
                          } else {
                            analyzeAndStartChat();
                          }
                        }
                      }} 
                      className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <span className="font-medium">Start Learning</span>
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="flex justify-center py-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Analysing...
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Chat screen - now uses the GuestChat component!
  return (
    <>
      <GuestChat
        messages={guestChat.messages}
        sending={guestChat.sending}
        pendingImage={guestChat.pendingImage}
        imagePreview={imagePreview}
        analysis={analysis}
        betaTesterName={betaTesterName}
        onSendMessage={guestChat.sendMessage}
        onConfirmImage={guestChat.confirmImageUpload}
        onCancelImage={() => guestChat.setPendingImage(null)}
        onImageUpload={guestChat.handleImageUpload}
        onNewProblem={handleNewProblemSubmit}
        onBrowseSyllabus={() => {
          setStep('home');
          guestChat.resetChat();
          setImagePreview(null);
          setAnalysis(null);
        }}
        onSettings={() => setStep('setup')}
        betaMode={BETA_MODE}
      />
      
      {/* Beta modals */}
      <BetaEntryModal 
        open={showBetaEntry} 
        onComplete={handleBetaEntryComplete} 
      />
      
      <PostSessionSurvey
        open={showSurvey}
        onComplete={handleSurveyComplete}
      />
    </>
  );
}
