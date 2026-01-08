import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, X, Swords } from 'lucide-react';
import { useArenaSession } from '@/hooks/useArenaSession';
import { useAuth } from '@/hooks/useAuth';
import ArenaProgress from '@/components/ArenaProgress';
import ArenaQuestion from '@/components/ArenaQuestion';
import ArenaSelfRating from '@/components/ArenaSelfRating';
import ArenaSignupModal from '@/components/ArenaSignupModal';
import { supabase } from '@/integrations/supabase/client';
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

  // Load topics and start session
  useEffect(() => {
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

      // Start the session
      await startSession(topicsData as Topic[], difficulty, count);
    };

    loadAndStart();
  }, [navigate, searchParams, startSession]);

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
        
        {/* Starfield background */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 overflow-hidden">
            {/* Rushing stars */}
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                  opacity: Math.random() * 0.8 + 0.2,
                  animation: `rushingStar ${Math.random() * 1.5 + 0.5}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
            {/* Larger trailing stars */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`trail-${i}`}
                className="absolute bg-gradient-to-r from-primary/60 to-transparent"
                style={{
                  left: `${Math.random() * 80}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 40 + 20}px`,
                  height: '2px',
                  borderRadius: '1px',
                  opacity: Math.random() * 0.6 + 0.2,
                  animation: `rushingStar ${Math.random() * 1 + 0.3}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
                <Swords className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <p className="text-foreground font-medium text-lg">{loadingMessage}</p>
            </div>
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
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-4xl">🎉</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Well done!</h2>
              <p className="text-muted-foreground">
                You completed {questionCount} questions
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
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              Back to Home
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
