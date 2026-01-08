import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { recordAttempt, recordSessionComplete } from '@/pages/Progress';

interface Topic {
  id: string;
  name: string;
  slug: string;
  section: string | null;
}

interface ArenaQuestion {
  id: string;
  topic_id: string;
  difficulty_tier: number;
  question_text: string;
  final_answer: string;
  marking_points: string[];
  worked_solution: string;
}

interface ArenaAttempt {
  id: string;
  question_id: string;
  topic_id: string;
  status: 'correct' | 'partial' | 'incorrect' | null;
  marks_estimate: string | null;
  self_rating: 'easy' | 'ok' | 'hard' | null;
  feedback_summary: string | null;
}

interface EvaluationResult {
  status: 'correct' | 'partial' | 'incorrect';
  marks_estimate: string;
  feedback_summary: string;
  next_action: 'ask_for_working' | 'ask_for_final_answer' | 'give_next_step_hint' | 'show_model_solution' | 'complete';
  next_prompt?: string;
}

export function useArenaSession() {
  const [sessionId] = useState(() => `arena-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
  const [difficulty, setDifficulty] = useState(3);
  const [questionCount, setQuestionCount] = useState(5);
  
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attempts, setAttempts] = useState<ArenaAttempt[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [attemptCount, setAttemptCount] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  
  // Fluency tracking
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [hintsUsedThisQuestion, setHintsUsedThisQuestion] = useState(0);

  const currentQuestion = questions[currentQuestionIndex] || null;
  const currentAttempt = attempts.find(a => a.question_id === currentQuestion?.id) || null;
  const isComplete = currentQuestionIndex >= questionCount && questions.length > 0;
  const progress = questions.length > 0 ? (currentQuestionIndex / questionCount) * 100 : 0;

  const generateQuestion = useCallback(async (topic: Topic): Promise<ArenaQuestion | null> => {
    try {
      const response = await supabase.functions.invoke('generate-arena-question', {
        body: {
          topic_id: topic.id,
          topic_name: topic.name,
          difficulty_tier: difficulty,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data as ArenaQuestion;
    } catch (err) {
      console.error('Failed to generate question:', err);
      return null;
    }
  }, [difficulty]);

  const startSession = useCallback(async (topics: Topic[], diff: number, count: number) => {
    setSelectedTopics(topics);
    setDifficulty(diff);
    setQuestionCount(count);
    setQuestions([]);
    setAttempts([]);
    setCurrentQuestionIndex(0);
    setError(null);
    setAttemptCount(0);
    setShowSolution(false);
    setIsGenerating(true);
    setQuestionStartTime(Date.now());
    setHintsUsedThisQuestion(0);

    try {
      // Generate first question
      const shuffledTopics = [...topics].sort(() => Math.random() - 0.5);
      const firstTopic = shuffledTopics[0];
      const question = await generateQuestion(firstTopic);
      
      if (question) {
        setQuestions([question]);
      } else {
        setError('Failed to generate question. Please try again.');
      }
    } catch (err) {
      setError('Failed to start session. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [generateQuestion]);

  const submitAnswer = useCallback(async (
    answer?: string,
    imageUrl?: string
  ): Promise<EvaluationResult | null> => {
    if (!currentQuestion) return null;
    
    setIsEvaluating(true);
    setAttemptCount(prev => prev + 1);

    try {
      const response = await supabase.functions.invoke('evaluate-arena-answer', {
        body: {
          question_text: currentQuestion.question_text,
          final_answer: currentQuestion.final_answer,
          marking_points: currentQuestion.marking_points,
          student_answer: answer,
          student_image_url: imageUrl,
          attempt_number: attemptCount + 1,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data as EvaluationResult;
      
      // Calculate time spent on this question
      const timeSpentSec = Math.round((Date.now() - questionStartTime) / 1000);
      
      // Count hints (each attempt after the first is considered getting help)
      const hintsThisAttempt = attemptCount > 0 ? 1 : 0;
      setHintsUsedThisQuestion(prev => prev + hintsThisAttempt);
      const totalHints = hintsUsedThisQuestion + hintsThisAttempt;
      
      // Record to localStorage for progress tracking (include fluency data)
      const topic = selectedTopics.find(t => t.id === currentQuestion.topic_id);
      if (topic && (result.status === 'correct' || result.next_action === 'show_model_solution')) {
        recordAttempt(topic.name, result.status === 'correct', totalHints, timeSpentSec);
      }
      
      const attemptData = {
        session_id: sessionId,
        question_id: currentQuestion.id,
        topic_id: currentQuestion.topic_id,
        difficulty_tier: currentQuestion.difficulty_tier,
        status: result.status,
        marks_estimate: result.marks_estimate,
        feedback_summary: result.feedback_summary,
        working_image_urls: imageUrl ? [imageUrl] : null,
        hints_used: totalHints,
        time_spent_sec: timeSpentSec,
      };

      const { data: savedAttempt, error: saveError } = await supabase
        .from('arena_attempts')
        .insert(attemptData)
        .select()
        .single();

      if (savedAttempt && !saveError) {
        setAttempts(prev => {
          const filtered = prev.filter(a => a.question_id !== currentQuestion.id);
          return [...filtered, savedAttempt as ArenaAttempt];
        });
      }

      // If complete or showing solution, prepare to move on
      if (result.next_action === 'complete' || result.next_action === 'show_model_solution') {
        if (result.next_action === 'show_model_solution') {
          setShowSolution(true);
        }
      }

      return result;
    } catch (err) {
      console.error('Failed to evaluate answer:', err);
      setError('Failed to evaluate your answer. Please try again.');
      return null;
    } finally {
      setIsEvaluating(false);
    }
  }, [currentQuestion, attemptCount, sessionId]);

  const submitSelfRating = useCallback(async (rating: 'easy' | 'ok' | 'hard') => {
    if (!currentQuestion || !currentAttempt) return;

    // Update the attempt with self-rating
    await supabase
      .from('arena_attempts')
      .update({ self_rating: rating })
      .eq('id', currentAttempt.id);

    setAttempts(prev => 
      prev.map(a => a.id === currentAttempt.id ? { ...a, self_rating: rating } : a)
    );
  }, [currentQuestion, currentAttempt]);

  const nextQuestion = useCallback(async () => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex >= questionCount) {
      setCurrentQuestionIndex(nextIndex);
      recordSessionComplete(); // Track completed session
      return;
    }

    setIsGenerating(true);
    setAttemptCount(0);
    setShowSolution(false);
    setQuestionStartTime(Date.now());
    setHintsUsedThisQuestion(0);

    try {
      // Pick a random topic for next question
      const shuffledTopics = [...selectedTopics].sort(() => Math.random() - 0.5);
      const nextTopic = shuffledTopics[nextIndex % shuffledTopics.length];
      const question = await generateQuestion(nextTopic);

      if (question) {
        setQuestions(prev => [...prev, question]);
        setCurrentQuestionIndex(nextIndex);
      } else {
        setError('Failed to generate next question.');
      }
    } catch (err) {
      setError('Failed to load next question.');
    } finally {
      setIsGenerating(false);
    }
  }, [currentQuestionIndex, questionCount, selectedTopics, generateQuestion]);

  const skipQuestion = useCallback((reason?: 'too_hard' | 'too_easy' | 'unclear' | 'not_interested') => {
    // Record as skipped - fire and forget for speed
    if (currentQuestion) {
      const attemptData = {
        session_id: sessionId,
        question_id: currentQuestion.id,
        topic_id: currentQuestion.topic_id,
        difficulty_tier: currentQuestion.difficulty_tier,
        status: 'incorrect' as const,
        marks_estimate: '0/5',
        feedback_summary: reason ? `Skipped: ${reason}` : 'Skipped',
      };
      
      // Don't await - let it run in background
      supabase.from('arena_attempts').insert(attemptData).then(() => {});
    }
    
    // Immediately move to next question
    nextQuestion();
  }, [currentQuestion, sessionId, nextQuestion]);

  return {
    // State
    sessionId,
    selectedTopics,
    difficulty,
    questionCount,
    questions,
    currentQuestion,
    currentQuestionIndex,
    currentAttempt,
    attempts,
    isGenerating,
    isEvaluating,
    error,
    isComplete,
    progress,
    attemptCount,
    showSolution,
    
    // Actions
    startSession,
    submitAnswer,
    submitSelfRating,
    nextQuestion,
    skipQuestion,
    setShowSolution,
  };
}
