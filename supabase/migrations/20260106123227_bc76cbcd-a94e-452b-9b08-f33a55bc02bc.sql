-- Add beta tracking columns to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS beta_tester_name TEXT DEFAULT NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS first_input_method TEXT DEFAULT NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS post_confidence INT CHECK (post_confidence BETWEEN 1 AND 5);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS would_use_again TEXT CHECK (would_use_again IN ('yes', 'no', 'maybe'));
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS beta_feedback TEXT DEFAULT NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_completed BOOLEAN DEFAULT FALSE;

-- Add student behavior tracking to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS student_behavior TEXT DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS input_method TEXT DEFAULT NULL;