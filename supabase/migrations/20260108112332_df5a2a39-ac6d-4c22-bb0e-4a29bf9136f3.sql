-- Arena questions table for caching generated questions
CREATE TABLE public.arena_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) NOT NULL,
  difficulty_tier INTEGER NOT NULL CHECK (difficulty_tier BETWEEN 1 AND 5),
  question_text TEXT NOT NULL,
  final_answer TEXT NOT NULL,
  marking_points TEXT[] NOT NULL,
  worked_solution TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Arena attempts table for tracking user submissions
CREATE TABLE public.arena_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- nullable for guests
  session_id TEXT NOT NULL, -- groups attempts in one arena run
  question_id UUID REFERENCES public.arena_questions(id) NOT NULL,
  topic_id UUID REFERENCES public.topics(id) NOT NULL,
  difficulty_tier INTEGER NOT NULL,
  status TEXT CHECK (status IN ('correct', 'partial', 'incorrect')),
  marks_estimate TEXT,
  self_rating TEXT CHECK (self_rating IN ('easy', 'ok', 'hard')),
  working_image_urls TEXT[],
  feedback_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.arena_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_attempts ENABLE ROW LEVEL SECURITY;

-- Anyone can view questions (they're generated content)
CREATE POLICY "Anyone can view arena questions"
ON public.arena_questions FOR SELECT
USING (true);

-- Service role can insert questions (from edge function)
CREATE POLICY "Service role can insert arena questions"
ON public.arena_questions FOR INSERT
WITH CHECK (true);

-- Users can view their own attempts (by user_id or session_id for guests)
CREATE POLICY "Users can view own attempts"
ON public.arena_attempts FOR SELECT
USING (true);

-- Anyone can insert attempts (guests use session_id)
CREATE POLICY "Anyone can insert attempts"
ON public.arena_attempts FOR INSERT
WITH CHECK (true);

-- Users can update their own attempts
CREATE POLICY "Users can update own attempts"
ON public.arena_attempts FOR UPDATE
USING (true);

-- Index for faster lookups
CREATE INDEX idx_arena_questions_topic_difficulty ON public.arena_questions(topic_id, difficulty_tier);
CREATE INDEX idx_arena_attempts_session ON public.arena_attempts(session_id);
CREATE INDEX idx_arena_attempts_user ON public.arena_attempts(user_id);