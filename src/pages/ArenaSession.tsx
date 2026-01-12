import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useArenaSession } from '@/hooks/useArenaSession';
import { useAuth } from '@/hooks/useAuth';
import ArenaProgress from '@/components/ArenaProgress';
import ArenaQuestion from '@/components/ArenaQuestion';
import ArenaSelfRating from '@/components/ArenaSelfRating';
import ArenaSignupModal from '@/components/ArenaSignupModal';
import { supabase } from '@/integrations/supabase/client';
import orbitIcon from '@/assets/orbit-icon.png';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Topic {
  id: string;
  name: string;
  slug: string;
  section: string | null;
}

const loadingMessages = [
  "Entering the arena",
  "Warming up the challenge",
  "Selecting your question",
  "Calibrating difficulty",
  "Almost ready",
];

function useLoadingMessage() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 400);

    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 2500);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return `${loadingMessages[messageIndex]}${dots}`;
}

export default function ArenaSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const loadingMessage = useLoadingMessage();
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'partial' | 'incorrect';
    marks_estimate: string;
    feedback_summary: string;
    next_prompt?: string;
  } | null>(null);
  const [showRating, setShowRating] = useState(false);

  const {
    currentQuestion,
    currentQuestionIndex,
    questionCount,
    attempts,
    isGenerating,
    isEvaluating,
    error,
    isComplete,
    attemptCount,
    showSolution,
    startSession,
    submitAnswer,
    submitSelfRating,
    nextQuestion,
    skipQuestion,
    setShowSolution,
  } = useArenaSession();

  // Track if session has been started to prevent multiple calls
  const [sessionStarted, setSessionStarted] = useState(false);

  // Load topics and start session - only once
  useEffect(() => {
    if (sessionStarted) return;

    const loadAndStart = async () => {
      // Get selected topic IDs from session storage
      const storedTopicIds = sessionStorage.getItem('arenaTopics');
      const difficulty = parseInt(searchParams.get('difficulty') || '3');
      const count = parseInt(searchParams.get('count') || '5');

      if (!storedTopicIds) {
        navigate('/practice-arena');
        return;
      }

      const selectedIds = JSON.parse(storedTopicIds) as string[];
      
      // Fetch topic details
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*')
        .in('id', selectedIds);

      if (!topicsData || topicsData.length === 0) {
        navigate('/practice-arena');
        return;
      }

      setTopics(topicsData as Topic[]);
      setIsLoading(false);
      setSessionStarted(true);

      // Start the session
      await startSession(topicsData as Topic[], difficulty, count);
    };

    loadAndStart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitAnswer = async (answer?: string, imageUrl?: string) => {
    const result = await submitAnswer(answer, imageUrl);
    if (result) {
      setFeedback(result);
      
      // If correct or showing solution, show rating after a short delay
      if (result.status === 'correct' || result.next_action === 'show_model_solution') {
        setTimeout(() => setShowRating(true), 500);
      }
    }
  };

  const handleShowSolution = () => {
    setShowSolution(true);
    setShowRating(true);
  };

  const handleSelfRating = async (rating: 'easy' | 'ok' | 'hard') => {
    await submitSelfRating(rating);
    setShowRating(false);
    setFeedback(null);
  };

  const handleNext = () => {
    setFeedback(null);
    setShowRating(false);
    nextQuestion();
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    sessionStorage.removeItem('arenaTopics');
    navigate('/');
  };

  // Handle session complete
  useEffect(() => {
    if (isComplete && !user) {
      // Show signup modal for guests
      setTimeout(() => setShowSignupModal(true), 500);
    }
  }, [isComplete, user]);

  if (isLoading || (isGenerating && !currentQuestion)) {
    return (
      <div className="min-h-screen flex flex-col bg-background overflow-hidden">
        <header className="flex items-center gap-3 p-4 border-b border-border relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Practice Arena</h1>
        </header>
        
        {/* Warp speed starfield - stars racing towards viewer */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 overflow-hidden bg-background">
            {/* Center point glow */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(172 100% 49% / 0.5) 0%, transparent 70%)',
                filter: 'blur(12px)',
              }}
            />
            
            {/* Warp stars - more visible */}
            {Array.from({ length: 120 }).map((_, i) => {
              const angle = (i / 120) * 360 + Math.random() * 15;
              const radians = (angle * Math.PI) / 180;
              const distance = 120 + Math.random() * 80;
              const tx = `${Math.cos(radians) * distance}vw`;
              const ty = `${Math.sin(radians) * distance}vh`;
              const isMint = Math.random() > 0.6;
              const size = Math.random() * 3 + 1.5;
              
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 rounded-full"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    background: isMint 
                      ? 'hsl(172 100% 65%)' 
                      : `rgba(255, 255, 255, ${0.7 + Math.random() * 0.3})`,
                    boxShadow: isMint 
                      ? `0 0 ${size * 3}px hsl(172 100% 60% / 0.9)` 
                      : `0 0 ${size * 2}px rgba(255, 255, 255, 0.5)`,
                    '--tx': tx,
                    '--ty': ty,
                    animation: `warpStar ${2 + Math.random() * 1.5}s linear infinite`,
                    animationDelay: `${Math.random() * 3}s`,
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
          
          {/* Center glow only - no logo or text */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div 
              className="w-40 h-40 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(172 100% 49% / 0.35) 0%, hsl(172 100% 49% / 0.12) 40%, transparent 70%)',
                filter: 'blur(24px)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex items-center gap-3 p-4 border-b border-border">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Practice Arena</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <button 
              onClick={() => navigate('/practice-arena')}
              className="text-primary underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const correctCount = attempts.filter(a => a.status === 'correct').length;
    const partialCount = attempts.filter(a => a.status === 'partial').length;
    
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex items-center gap-3 p-4 border-b border-border">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Session Complete</h1>
        </header>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-sm">
            {/* Orbit logo with glow */}
            <div className="relative mx-auto w-24 h-24">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, hsl(172 100% 49% / 0.4) 0%, hsl(172 100% 49% / 0.15) 40%, transparent 70%)',
                  filter: 'blur(16px)',
                  transform: 'scale(1.4)',
                }}
              />
              <img 
                src={orbitIcon} 
                alt="Orbit" 
                className="relative w-24 h-24 object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Here's how you did</h2>
              <p className="text-muted-foreground">
                {questionCount} questions completed
              </p>
            </div>
            <div className="flex justify-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{correctCount}</div>
                <div className="text-muted-foreground">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{partialCount}</div>
                <div className="text-muted-foreground">Partial</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {questionCount - correctCount - partialCount}
                </div>
                <div className="text-muted-foreground">Missed</div>
              </div>
            </div>
            
            {/* Account signup prompt for guests */}
            {!user && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-left">
                <p className="text-sm font-medium text-primary mb-1">Track your progress</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Create an account to save your results and get questions tailored to your weak spots.
                </p>
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
                >
                  Create free account
                </button>
              </div>
            )}
            
            <button
              onClick={() => navigate('/')}
              className={cn(
                "px-6 py-3 rounded-xl font-medium",
                user ? "bg-primary text-primary-foreground" : "text-muted-foreground underline"
              )}
            >
              {user ? 'Back to Home' : 'Continue as guest'}
            </button>
          </div>
        </div>

        <ArenaSignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          attempts={attempts}
          questionCount={questionCount}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with progress */}
      <header className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Practice Arena</h1>
          <button
            onClick={handleExit}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ArenaProgress current={currentQuestionIndex} total={questionCount} />
      </header>

      {/* Question area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentQuestion && (
          <ArenaQuestion
            question={currentQuestion}
            topicName={topics.find(t => t.id === currentQuestion.topic_id)?.name}
            isEvaluating={isEvaluating}
            attemptCount={attemptCount}
            showSolution={showSolution}
            onSubmitAnswer={handleSubmitAnswer}
            onShowSolution={handleShowSolution}
            onNext={handleNext}
            onSkip={skipQuestion}
            feedback={feedback}
            isFirstQuestion={currentQuestionIndex === 0}
          />
        )}

        {/* Self rating overlay */}
        {showRating && !isComplete && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
            <ArenaSelfRating onRate={handleSelfRating} />
          </div>
        )}
      </div>

      {/* Exit confirmation */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Practice?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress won't be saved. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
